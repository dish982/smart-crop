'use client';

import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  ShieldCheck,
} from 'lucide-react';
import { DISEASE_KNOWLEDGE_BASE } from '@/data/diseaseData';

const CROP_OPTIONS = {
  Tomato: 'Tomato',
  Potato: 'Potato',
  Corn: 'Corn',
};

export default function DiseaseDetect() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedCrop, setSelectedCrop] = useState('Tomato');

  // Keep the model in memory so we don't download it every time.
  const modelRef = useRef(null);
  const classIndicesRef = useRef(null);

  // ------------------------------------------------------------
  // LOAD MODEL ONCE
  // ------------------------------------------------------------
  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();

        const model = await tf.loadGraphModel('/model/model.json');

        const response = await fetch('/model/class_indices.json');

        if (!response.ok) {
          throw new Error('Could not load class_indices.json');
        }

        const classIndices = await response.json();

        modelRef.current = model;
        classIndicesRef.current = classIndices;

        console.log('✅ TensorFlow.js model loaded');
        console.log('✅ Class mapping loaded:', classIndices);
      } catch (err) {
        console.error('Model loading error:', err);
        setError(
          'Could not load the disease detection model. Please refresh the page and try again.'
        );
      }
    };

    loadModel();

    // Clean up model when leaving the page.
    return () => {
      if (modelRef.current) {
        modelRef.current.dispose();
        modelRef.current = null;
      }
    };
  }, []);

  // ------------------------------------------------------------
  // RESET
  // ------------------------------------------------------------
  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  // ------------------------------------------------------------
  // FILE SELECT
  // ------------------------------------------------------------
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setResult(null);
    setError(null);
  };

  // ------------------------------------------------------------
  // GET CLASS NAME FROM INDEX
  // ------------------------------------------------------------
  const getClassNameFromIndex = (index) => {
    const mapping = classIndicesRef.current;

    if (!mapping) return null;

    // class_indices.json is:
    // {
    //   "Tomato___Bacterial_spot": 0,
    //   ...
    // }

    const entry = Object.entries(mapping).find(
      ([, classIndex]) => Number(classIndex) === index
    );

    return entry ? entry[0] : null;
  };

  // ------------------------------------------------------------
  // GET CROP FROM CLASS NAME
  // ------------------------------------------------------------
  const getCropFromClassName = (className) => {
    if (!className) return null;

    if (className.startsWith('Tomato___')) return 'Tomato';
    if (className.startsWith('Potato___')) return 'Potato';
    if (className.startsWith('Corn___')) return 'Corn';

    return null;
  };

  // ------------------------------------------------------------
  // PREDICT
  // ------------------------------------------------------------
  const handleUpload = async () => {
    if (!file) return;

    if (!modelRef.current || !classIndicesRef.current) {
      setError('Disease detection model is still loading. Please wait a moment.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // --------------------------------------------------------
      // Load image
      // --------------------------------------------------------
      const image = new Image();

      const imageUrl = URL.createObjectURL(file);

      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = imageUrl;
      });

      // --------------------------------------------------------
      // PREPROCESS IMAGE
      //
      // Same preprocessing used during model training:
      // 224 x 224 RGB
      // pixel values / 255
      // --------------------------------------------------------
      const input = tf.browser
        .fromPixels(image)
        .resizeBilinear([224, 224])
        .toFloat()
        .div(255)
        .expandDims(0);

      URL.revokeObjectURL(imageUrl);

      // --------------------------------------------------------
      // RUN MODEL
      // --------------------------------------------------------
      const prediction = modelRef.current.predict(input);

      const probabilities = await prediction.data();

      // Temporary tensors can now be released.
      input.dispose();
      prediction.dispose();

      // --------------------------------------------------------
      // FIND GLOBAL TOP PREDICTION
      // --------------------------------------------------------
      let globalTopIndex = 0;

      for (let i = 1; i < probabilities.length; i++) {
        if (probabilities[i] > probabilities[globalTopIndex]) {
          globalTopIndex = i;
        }
      }

      const globalTopClass = getClassNameFromIndex(globalTopIndex);
      const globalTopCrop = getCropFromClassName(globalTopClass);

      // --------------------------------------------------------
      // CROP-SPECIFIC FILTERING
      //
      // Only classes belonging to the selected crop are considered
      // for the final displayed diagnosis.
      // --------------------------------------------------------
      let selectedCropTopIndex = -1;
      let selectedCropTopProbability = -1;

      for (let i = 0; i < probabilities.length; i++) {
        const className = getClassNameFromIndex(i);
        const classCrop = getCropFromClassName(className);

        if (classCrop !== selectedCrop) continue;

        if (probabilities[i] > selectedCropTopProbability) {
          selectedCropTopProbability = probabilities[i];
          selectedCropTopIndex = i;
        }
      }

      if (selectedCropTopIndex === -1) {
        throw new Error(
          `No model classes were found for ${selectedCrop}.`
        );
      }

      const selectedCropClass =
        getClassNameFromIndex(selectedCropTopIndex);

      const selectedCropConfidence =
        Number((selectedCropTopProbability * 100).toFixed(2));

      // --------------------------------------------------------
      // CROP MISMATCH CHECK
      //
      // Example:
      // User selects Tomato
      // Model's strongest overall prediction = Potato___Early_blight
      //
      // In this situation we DON'T force the potato prediction
      // into a tomato diagnosis.
      // --------------------------------------------------------
      if (globalTopCrop && globalTopCrop !== selectedCrop) {
        setResult({
          type: 'crop-mismatch',
          selectedCrop,
          detectedCrop: globalTopCrop,
          modelPrediction: globalTopClass,
          modelConfidence: Number(
            (probabilities[globalTopIndex] * 100).toFixed(2)
          ),
        });

        return;
      }

      // --------------------------------------------------------
      // NORMAL RESULT
      // --------------------------------------------------------
      setResult({
        type: 'diagnosis',
        prediction: selectedCropClass,
        confidence: selectedCropConfidence,
      });
    } catch (err) {
      console.error('Prediction error:', err);

      setError(
        err.message || 'Something went wrong while detecting the disease.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------
  // RESULT INFORMATION
  // ------------------------------------------------------------
  const detectedClass =
    result?.type === 'diagnosis' ? result.prediction : '';

  const info =
    DISEASE_KNOWLEDGE_BASE[detectedClass] || {
      severity: 'Information unavailable',
      symptoms: ['Disease information is not available yet.'],
      treatmentCategory: 'Consult an agricultural expert',
      purpose:
        'The model detected a supported class, but detailed guidance has not been added yet.',
      precautions: [
        'Do not apply chemical treatment without confirmation.',
        'Consider getting the diagnosis verified by a local agricultural expert.',
      ],
    };

  const confidence =
    result?.type === 'diagnosis' ? result.confidence : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">

      {/* ------------------------------------------------------ */}
      {/* HEADER */}
      {/* ------------------------------------------------------ */}

      <div>
        <h1 className="text-2xl font-bold text-primary-green">
          Crop Disease Detection
        </h1>

        <p className="text-sm text-text-subtle">
          Select the crop and upload a clear leaf photograph to
          diagnose supported diseases.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ---------------------------------------------------- */}
        {/* UPLOAD CARD */}
        {/* ---------------------------------------------------- */}

        <div className="bg-surface-card border border-border-light rounded-xl p-6 shadow-soft space-y-4">

          <h2 className="font-semibold text-lg text-text-main flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-primary-green" />
            Upload Leaf Image
          </h2>

          {/* CROP SELECTOR */}

          <div className="space-y-2">
            <label
              htmlFor="crop"
              className="text-sm font-medium text-text-main"
            >
              Select Crop
            </label>

            <select
              id="crop"
              value={selectedCrop}
              onChange={(e) => {
                setSelectedCrop(e.target.value);
                setResult(null);
                setError(null);
              }}
              className="w-full border border-border-light rounded-lg px-3 py-2.5 bg-surface-card text-text-main focus:outline-none focus:border-primary-green"
            >
              <option value={CROP_OPTIONS.Tomato}>Tomato</option>
              <option value={CROP_OPTIONS.Potato}>Potato</option>
              <option value={CROP_OPTIONS.Corn}>Corn</option>
            </select>

            <p className="text-xs text-text-subtle">
              The prediction will only consider diseases belonging
              to the selected crop.
            </p>
          </div>

          {/* IMAGE UPLOAD */}

          <label className="border-2 border-dashed border-border-light hover:border-primary-green rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all bg-surface-muted/50 min-h-55">

            {preview ? (
              <img
                src={preview}
                alt="Leaf preview"
                className="max-h-52 rounded-lg object-contain"
              />
            ) : (
              <div className="text-center space-y-2">
                <div className="p-3 bg-surface-card rounded-full inline-block shadow-soft">
                  <ImageIcon className="w-8 h-8 text-primary-green" />
                </div>

                <p className="text-sm font-medium text-text-main">
                  Click to upload or drag & drop
                </p>

                <p className="text-xs text-text-subtle">
                  PNG, JPG, or JPEG (Max 10MB)
                </p>
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {/* DIAGNOSE BUTTON */}

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full bg-primary-green hover:bg-opacity-90 text-white font-medium py-2.5 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing Leaf...
              </>
            ) : (
              'Diagnose Crop'
            )}
          </button>

          {result && (
            <button
              onClick={handleReset}
              className="text-xs text-text-subtle hover:text-primary-green underline"
            >
              ↻ Retake / Diagnose another leaf
            </button>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-accent-cherry border border-red-200 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- */}
        {/* RESULTS CARD */}
        {/* ---------------------------------------------------- */}

        <div className="bg-surface-card border border-border-light rounded-xl p-6 shadow-soft">

          <h2 className="font-semibold text-lg text-text-main mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary-green" />
            Diagnosis Report
          </h2>

          {/* NO RESULT */}

          {!result && (
            <div className="h-48 border border-dashed border-border-light rounded-xl flex items-center justify-center text-center p-4 text-text-subtle text-sm">
              Select a crop, upload an image and click
              &quot;Diagnose Crop&quot; to view diagnosis details.
            </div>
          )}

          {/* CROP MISMATCH */}

          {result?.type === 'crop-mismatch' && (
            <div className="space-y-4">

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">

                  <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />

                  <div>
                    <p className="font-bold text-amber-900">
                      Image Does Not Match Selected Crop
                    </p>

                    <p className="text-sm text-amber-800 mt-2">
                      You selected{' '}
                      <strong>{result.selectedCrop}</strong>, but
                      the model&apos;s strongest overall prediction
                      belongs to <strong>{result.detectedCrop}</strong>.
                    </p>

                    <p className="text-xs text-amber-800 mt-2">
                      Please select the correct crop and upload a
                      clear leaf image.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-surface-muted rounded-xl border border-border-light">
                <p className="text-xs text-text-subtle uppercase tracking-wider font-semibold">
                  Model&apos;s strongest prediction
                </p>

                <p className="text-lg font-bold text-text-main mt-1">
                  {result.modelPrediction
                    ?.replace(/___/g, ': ')
                    .replace(/_/g, ' ')}
                </p>

                <p className="text-sm text-text-subtle mt-1">
                  Model score: {result.modelConfidence}%
                </p>
              </div>

            </div>
          )}

          {/* NORMAL DIAGNOSIS */}

          {result?.type === 'diagnosis' && (
            <div className="space-y-4">

              <div className="p-4 bg-surface-muted rounded-xl border border-border-light">

                <p className="text-xs text-text-subtle uppercase tracking-wider font-semibold">
                  Selected Crop
                </p>

                <p className="text-sm font-semibold text-text-main mt-1">
                  {selectedCrop}
                </p>

                <p className="text-xs text-text-subtle uppercase tracking-wider font-semibold mt-4">
                  Detected Condition
                </p>

                <p className="text-xl font-bold text-primary-green mt-1">
                  {detectedClass
                    .replace(/___/g, ': ')
                    .replace(/_/g, ' ')}
                </p>

              </div>

              <div className="p-4 bg-surface-muted rounded-xl border border-border-light">

                <p className="text-xs text-text-subtle uppercase tracking-wider font-semibold">
                  Confidence Score
                </p>

                <div className="flex items-center gap-3 mt-1">

                  <div className="flex-1 bg-border-light h-3 rounded-full overflow-hidden">

                    <div
                      className="bg-primary-green h-full transition-all duration-500"
                      style={{ width: `${confidence}%` }}
                    />

                  </div>

                  <span className="text-sm font-bold text-text-main">
                    {confidence}%
                  </span>

                </div>

              </div>

            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------ */}
      {/* TREATMENT GUIDANCE */}
      {/* ------------------------------------------------------ */}

      {result?.type === 'diagnosis' && (
        <div className="bg-surface-card border border-border-light rounded-xl p-6 shadow-soft space-y-4">

          <h3 className="font-bold text-lg text-text-main">
            What should you do?
          </h3>

          <div className="p-4 bg-primary-green/10 border border-primary-green/20 rounded-xl">

            <p className="text-xs uppercase text-primary-green font-bold tracking-wider">
              Treatment Category
            </p>

            <p className="text-md font-bold text-primary-green mt-0.5">
              {info.treatmentCategory}
            </p>

            {info.purpose && (
              <p className="text-xs text-text-subtle mt-2">
                {info.purpose}
              </p>
            )}

          </div>

          {info.symptoms?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-text-main mb-2">
                Symptoms
              </p>

              <ul className="space-y-2">
                {info.symptoms.map((symptom, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-text-subtle"
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary-green shrink-0 mt-0.5" />
                    <span>{symptom}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-text-main mb-2">
              Precautions
            </p>

            <ul className="space-y-2">
              {info.precautions.map((prec, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs text-text-subtle"
                >
                  <ShieldCheck className="w-4 h-4 text-primary-green shrink-0 mt-0.5" />
                  <span>{prec}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      )}

    </div>
  );
}