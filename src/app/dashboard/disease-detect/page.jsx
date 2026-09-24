'use client';

import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import Link from 'next/link'; 
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
  History
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
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedCrop, setSelectedCrop] = useState('Tomato');
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  const modelRef = useRef(null);
  const classIndicesRef = useRef(null);

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
      } catch (err) {
        console.error('Model loading error:', err);
        setError('Could not load the disease detection model. Please refresh the page.');
      }
    };

    loadModel();

    return () => {
      if (modelRef.current) {
        modelRef.current.dispose();
        modelRef.current = null;
      }
    };
  }, []);

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setApiData(null);
    setError(null);
    setFeedbackSaved(false);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setResult(null);
    setApiData(null);
    setError(null);
    setFeedbackSaved(false);
  };

  const getClassNameFromIndex = (index) => {
    const mapping = classIndicesRef.current;
    if (!mapping) return null;
    const entry = Object.entries(mapping).find(
      ([, classIndex]) => Number(classIndex) === index
    );
    return entry ? entry[0] : null;
  };

  const getCropFromClassName = (className) => {
    if (!className) return null;
    if (className.startsWith('Tomato___')) return 'Tomato';
    if (className.startsWith('Potato___')) return 'Potato';
    if (className.startsWith('Corn___')) return 'Corn';
    return null;
  };

  const handleUpload = async () => {
    if (!file) return;

    if (!modelRef.current || !classIndicesRef.current) {
      setError('Disease detection model is still loading. Please wait a moment.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setApiData(null);

    try {
      const image = new Image();
      const imageUrl = URL.createObjectURL(file);

      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = imageUrl;
      });

      const input = tf.browser
        .fromPixels(image)
        .resizeBilinear([224, 224])
        .toFloat()
        .div(255)
        .expandDims(0);

      URL.revokeObjectURL(imageUrl);

      const prediction = modelRef.current.predict(input);
      const probabilities = await prediction.data();

      input.dispose();
      prediction.dispose();

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
        throw new Error(`No model classes found for ${selectedCrop}.`);
      }

      const predictedClass = getClassNameFromIndex(selectedCropTopIndex);
      const confidenceScore = Number((selectedCropTopProbability * 100).toFixed(2));

      // Guard: Random / Low confidence image filter
      if (confidenceScore < 60) {
        setError('Uploaded photo leaf nahi lag rahi hai ya image unclear hai. Please clear photo upload karein.');
        setLoading(false);
        return;
      }

      setResult({
        prediction: predictedClass,
        confidence: confidenceScore,
      });

      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: preview,
          cropName: selectedCrop,
          predictedClass,
          confidenceScore,
        }),
      });

      const resData = await response.json();

      if (resData.success) {
        setApiData(resData.data);
      } else {
        console.warn('Backend logging note:', resData.error);
      }
    } catch (err) {
      console.error('Prediction error:', err);
      setError(err.message || 'Something went wrong while detecting the disease.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (confirmed) => {
    if (!apiData?.historyId) return;

    try {
      const res = await fetch('/api/diagnose/confirm', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          historyId: apiData.historyId,
          confirmed,
        }),
      });

      if (res.ok) {
        setFeedbackSaved(true);
      }
    } catch (err) {
      console.error('Feedback submit error:', err);
    }
  };

  const detectedClass = result?.prediction || '';
  const info = DISEASE_KNOWLEDGE_BASE[detectedClass] || {
    severity: 'Moderate',
    symptoms: [
      'Leaf lesions or discolored spots visible on surface.',
      'Wilting or abnormal foliage patterns.',
    ],
    treatmentCategory: 'Standard Integrated Pest Management (IPM)',
    purpose: 'Apply recommended organic or targeted chemical controls early.',
    precautions: [
      'Ensure clear leaf focus and adequate sunlight for best diagnostics.',
      'Remove severely infected lower leaves to prevent spore spread.',
    ],
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">
      {/* Header with Direct History View Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-green">
            Crop Disease Detection
          </h1>
          <p className="text-sm text-text-subtle">
            Select crop and upload leaf photograph for ICAR-grounded diagnosis.
          </p>
        </div>

        <Link
          href="/dashboard/disease-detect/history"
          className="inline-flex items-center gap-2 px-4 py-2 border border-primary-green text-primary-green hover:bg-primary-green hover:text-white transition-all rounded-lg text-sm font-semibold shadow-sm shrink-0 w-fit"
        >
          <History className="w-4 h-4" />
          View Scan History
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Form Card */}
        <div className="bg-surface-card border border-border-light rounded-xl p-6 shadow-soft space-y-4">
          <h2 className="font-semibold text-lg text-text-main flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-primary-green" />
            Upload Leaf Image
          </h2>

          <div className="space-y-2">
            <label htmlFor="crop" className="text-sm font-medium text-text-main">
              Select Crop
            </label>
            <select
              id="crop"
              value={selectedCrop}
              onChange={(e) => {
                setSelectedCrop(e.target.value);
                setResult(null);
                setApiData(null);
                setError(null);
              }}
              className="w-full border border-border-light rounded-lg px-3 py-2.5 bg-surface-card text-text-main focus:outline-none focus:border-primary-green"
            >
              <option value={CROP_OPTIONS.Tomato}>Tomato</option>
              <option value={CROP_OPTIONS.Potato}>Potato</option>
              <option value={CROP_OPTIONS.Corn}>Corn</option>
            </select>
          </div>

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
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full bg-primary-green hover:bg-opacity-90 text-white font-medium py-2.5 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing & Saving History...
              </>
            ) : (
              'Diagnose Crop'
            )}
          </button>

          {result && (
            <button
              onClick={handleReset}
              className="text-xs text-text-subtle hover:text-primary-green underline block mx-auto"
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

        {/* Diagnosis Results Display */}
        <div className="bg-surface-card border border-border-light rounded-xl p-6 shadow-soft space-y-4">
          <h2 className="font-semibold text-lg text-text-main flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary-green" />
            Diagnosis Report
          </h2>

          {!result && (
            <div className="h-48 border border-dashed border-border-light rounded-xl flex items-center justify-center text-center p-4 text-text-subtle text-sm">
              Select crop & upload image to view diagnosis details and save log.
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="p-4 bg-surface-muted rounded-xl border border-border-light">
                <p className="text-xs text-text-subtle uppercase tracking-wider font-semibold">
                  Selected Crop: <span className="text-text-main">{selectedCrop}</span>
                </p>

                <p className="text-xs text-text-subtle uppercase tracking-wider font-semibold mt-3">
                  Detected Condition
                </p>
                <p className="text-xl font-bold text-primary-green mt-0.5">
                  {detectedClass.replace(/___/g, ': ').replace(/_/g, ' ')}
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
                      style={{ width: `${result.confidence}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-text-main">
                    {result.confidence}%
                  </span>
                </div>
              </div>

              {apiData && (
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3 mt-4">
                  {feedbackSaved ? (
                    <div className="space-y-2">
                      <p className="text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Thank you! Diagnosis accuracy verified and saved in history.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-emerald-900 mb-2">
                        Is this diagnosis accurate for your crop?
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleConfirm(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" /> Yes, Accurate
                        </button>
                        <button
                          onClick={() => handleConfirm(false)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" /> Incorrect
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}