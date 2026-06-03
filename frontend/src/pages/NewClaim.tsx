import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { claimsAPI, membersAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';

const NewClaim: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [memberLookup, setMemberLookup] = useState<{ found: boolean; name?: string; policy_status?: string } | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const [formData, setFormData] = useState({
    member_id: '',
    member_name: '',
    treatment_date: '',
    hospital: '',
    cashless_request: false,
    claim_amount: '',
    claim_type: 'consultation',
    // Document data (manual input for testing)
    doctor_name: '',
    doctor_reg: '',
    diagnosis: '',
    medicines: '',
    tests_prescribed: '',
    treatment: '',
    procedures: '',
    consultation_fee: '',
    diagnostic_tests_amount: '',
    medicines_amount: '',
    test_names: '',
    previous_claims_same_day: '0',
  });

  const [files, setFiles] = useState<File[]>([]);
  const [fileTypes, setFileTypes] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const lookupMember = async () => {
    if (!formData.member_id) return;
    try {
      const res = await membersAPI.lookup(formData.member_id);
      setMemberLookup(res.data);
      if (res.data.found) {
        setFormData(prev => ({ ...prev, member_name: res.data.name }));
      }
    } catch {
      setMemberLookup({ found: false });
    }
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
    setFileTypes(prev => [...prev, ...droppedFiles.map(() => 'bill')]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
    setFileTypes(prev => [...prev, ...selectedFiles.map(() => 'bill')]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFileTypes(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileType = (index: number, type: string) => {
    setFileTypes(prev => {
      const updated = [...prev];
      updated[index] = type;
      return updated;
    });
  };

  const buildDocumentsData = () => {
    const docs: Record<string, unknown> = {};

    // Build prescription data
    if (formData.doctor_name || formData.diagnosis) {
      docs.prescription = {
        doctor_name: formData.doctor_name,
        doctor_reg: formData.doctor_reg,
        diagnosis: formData.diagnosis,
        medicines_prescribed: formData.medicines
          ? formData.medicines.split(',').map(m => m.trim())
          : [],
        tests_prescribed: formData.tests_prescribed
          ? formData.tests_prescribed.split(',').map(t => t.trim())
          : [],
        treatment: formData.treatment,
        procedures: formData.procedures
          ? formData.procedures.split(',').map(p => p.trim())
          : [],
      };
    }

    // Build bill data
    const bill: Record<string, unknown> = {};
    if (formData.consultation_fee) bill.consultation_fee = parseFloat(formData.consultation_fee);
    if (formData.diagnostic_tests_amount) bill.diagnostic_tests = parseFloat(formData.diagnostic_tests_amount);
    if (formData.medicines_amount) bill.medicines = parseFloat(formData.medicines_amount);
    if (formData.test_names) bill.test_names = formData.test_names.split(',').map(t => t.trim());

    // Map specific bill items from procedures (for dental, etc.)
    if (formData.procedures) {
      const procs = formData.procedures.split(',').map(p => p.trim());
      for (const proc of procs) {
        const procLower = proc.toLowerCase();
        if (procLower.includes('root canal')) bill.root_canal = parseFloat(formData.consultation_fee) || 0;
        if (procLower.includes('whitening')) bill.teeth_whitening = parseFloat(formData.diagnostic_tests_amount) || 0;
        if (procLower.includes('mri')) bill.mri_scan = parseFloat(formData.claim_amount) || 0;
        if (procLower.includes('therapy')) bill.therapy_charges = parseFloat(formData.medicines_amount) || 0;
      }
    }

    if (Object.keys(bill).length > 0) {
      docs.bill = bill;
    }

    return docs;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let response;

      if (files.length > 0) {
        // Submit with files
        const formDataToSend = new FormData();
        formDataToSend.append('member_id', formData.member_id);
        formDataToSend.append('member_name', formData.member_name);
        formDataToSend.append('treatment_date', formData.treatment_date);
        formDataToSend.append('claim_amount', formData.claim_amount);
        formDataToSend.append('hospital', formData.hospital);
        formDataToSend.append('cashless_request', String(formData.cashless_request));
        formDataToSend.append('document_types', JSON.stringify(fileTypes));
        formDataToSend.append('previous_claims_same_day', formData.previous_claims_same_day);

        // Also send manual document data as fallback
        const docsData = buildDocumentsData();
        if (Object.keys(docsData).length > 0) {
          formDataToSend.append('documents_data', JSON.stringify(docsData));
        }

        files.forEach(file => formDataToSend.append('documents', file));
        response = await claimsAPI.submit(formDataToSend);
      } else {
        // Submit with JSON data only
        const docsData = buildDocumentsData();
        response = await claimsAPI.submitJSON({
          member_id: formData.member_id,
          member_name: formData.member_name,
          treatment_date: formData.treatment_date,
          claim_amount: formData.claim_amount,
          hospital: formData.hospital,
          cashless_request: formData.cashless_request,
          documents_data: JSON.stringify(docsData),
          previous_claims_same_day: formData.previous_claims_same_day,
        });
      }

      setResult(response.data.claim);
      setStep(5);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      alert(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Submit New Claim</h1>
        <p>Fill in the claim details and upload supporting documents</p>
      </div>

      {/* Step Wizard */}
      <div className="wizard-steps">
        {['Member Info', 'Treatment', 'Documents', 'Review', 'Result'].map((label, i) => (
          <div
            key={i}
            className={`wizard-step ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'completed' : ''}`}
          >
            <div className="step-number">
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span className="step-label">{label}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Step 1: Member Info */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '1.15rem', marginBottom: '1.5rem' }}>Member Information</h2>

            <div className="form-group">
              <label className="form-label">Member ID *</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  name="member_id"
                  value={formData.member_id}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g. EMP001"
                />
                <button className="btn btn-ghost" onClick={lookupMember} type="button">
                  Lookup
                </button>
              </div>
              {memberLookup && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  {memberLookup.found ? (
                    <span className="text-success">✅ Found: {memberLookup.name} ({memberLookup.policy_status})</span>
                  ) : (
                    <span className="text-danger">❌ Member not found</span>
                  )}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Member Name *</label>
              <input
                type="text"
                name="member_name"
                value={formData.member_name}
                onChange={handleChange}
                className="form-input"
                placeholder="Full name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Treatment Date *</label>
              <input
                type="date"
                name="treatment_date"
                value={formData.treatment_date}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => setStep(2)}
                disabled={!formData.member_id || !formData.member_name || !formData.treatment_date}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Treatment Details */}
        {step === 2 && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '1.15rem', marginBottom: '1.5rem' }}>Treatment Details</h2>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Hospital / Clinic</label>
                <input
                  type="text"
                  name="hospital"
                  value={formData.hospital}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g. Apollo Hospitals"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Claim Type</label>
                <select name="claim_type" value={formData.claim_type} onChange={handleChange} className="form-select">
                  <option value="consultation">Consultation</option>
                  <option value="dental">Dental</option>
                  <option value="vision">Vision</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="diagnostic">Diagnostic Tests</option>
                  <option value="alternative">Alternative Medicine</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Claim Amount (₹) *</label>
                <input
                  type="number"
                  name="claim_amount"
                  value={formData.claim_amount}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g. 1500"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Previous Same-Day Claims</label>
                <input
                  type="number"
                  name="previous_claims_same_day"
                  value={formData.previous_claims_same_day}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="cashless_request"
                  checked={formData.cashless_request}
                  onChange={handleChange}
                />
                <span className="form-label" style={{ margin: 0 }}>Cashless Claim Request</span>
              </label>
            </div>

            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', marginTop: '1.5rem', color: 'var(--text-secondary)' }}>
              Prescription Details
            </h3>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Doctor Name</label>
                <input type="text" name="doctor_name" value={formData.doctor_name} onChange={handleChange} className="form-input" placeholder="Dr. Sharma" />
              </div>
              <div className="form-group">
                <label className="form-label">Doctor Reg. No.</label>
                <input type="text" name="doctor_reg" value={formData.doctor_reg} onChange={handleChange} className="form-input" placeholder="KA/45678/2015" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Diagnosis</label>
              <input type="text" name="diagnosis" value={formData.diagnosis} onChange={handleChange} className="form-input" placeholder="e.g. Viral fever" />
            </div>

            <div className="form-group">
              <label className="form-label">Medicines Prescribed (comma-separated)</label>
              <input type="text" name="medicines" value={formData.medicines} onChange={handleChange} className="form-input" placeholder="Paracetamol 650mg, Vitamin C" />
            </div>

            <div className="form-group">
              <label className="form-label">Treatment / Procedures (comma-separated)</label>
              <input type="text" name="procedures" value={formData.procedures} onChange={handleChange} className="form-input" placeholder="e.g. Root canal treatment, Teeth whitening" />
            </div>

            <div className="form-group">
              <label className="form-label">Tests Prescribed (comma-separated)</label>
              <input type="text" name="tests_prescribed" value={formData.tests_prescribed} onChange={handleChange} className="form-input" placeholder="e.g. MRI Lumbar Spine" />
            </div>

            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', marginTop: '1.5rem', color: 'var(--text-secondary)' }}>
              Bill Breakdown
            </h3>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Consultation Fee (₹)</label>
                <input type="number" name="consultation_fee" value={formData.consultation_fee} onChange={handleChange} className="form-input" placeholder="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Diagnostic Tests (₹)</label>
                <input type="number" name="diagnostic_tests_amount" value={formData.diagnostic_tests_amount} onChange={handleChange} className="form-input" placeholder="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Medicines (₹)</label>
                <input type="number" name="medicines_amount" value={formData.medicines_amount} onChange={handleChange} className="form-input" placeholder="0" />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <button
                className="btn btn-primary"
                onClick={() => setStep(3)}
                disabled={!formData.claim_amount}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Documents */}
        {step === 3 && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Upload Documents</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Upload bills, prescriptions, and reports. Documents will be processed with OCR + AI for data extraction.
              You can also skip this step if you entered details manually.
            </p>

            <div
              className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <div className="upload-icon">📁</div>
              <p>Drag & drop files here, or click to browse</p>
              <p className="upload-hint">Supports JPEG, PNG, PDF, JSON (max 10MB each)</p>
            </div>
            <input
              id="file-input"
              type="file"
              multiple
              accept="image/*,.pdf,.json,application/json"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            {files.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                {files.map((file, index) => (
                  <div key={index} className="file-preview">
                    <span style={{ fontSize: '1.5rem' }}>
                      {file.type.includes('pdf') ? '📄' : '🖼️'}
                    </span>
                    <div className="file-info">
                      <div className="file-name">{file.name}</div>
                      <div className="file-size">{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <select
                      value={fileTypes[index]}
                      onChange={(e) => updateFileType(index, e.target.value)}
                      className="form-select"
                      style={{ width: 'auto', minWidth: '140px' }}
                    >
                      <option value="prescription">Prescription</option>
                      <option value="bill">Bill/Invoice</option>
                      <option value="report">Test Report</option>
                      <option value="pharmacy_bill">Pharmacy Bill</option>
                    </select>
                    <button className="file-remove" onClick={() => removeFile(index)}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
              <button className="btn btn-primary" onClick={() => setStep(4)}>
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '1.15rem', marginBottom: '1.5rem' }}>Review & Submit</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>MEMBER</h3>
                <div className="grid-2">
                  <div><span style={{ color: 'var(--text-muted)' }}>ID:</span> {formData.member_id}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Name:</span> {formData.member_name}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Treatment Date:</span> {formData.treatment_date}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Hospital:</span> {formData.hospital || 'Not specified'}</div>
                </div>
              </div>

              <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>CLAIM DETAILS</h3>
                <div className="grid-2">
                  <div><span style={{ color: 'var(--text-muted)' }}>Amount:</span> <strong>₹{parseFloat(formData.claim_amount || '0').toLocaleString()}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Type:</span> {formData.claim_type}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Cashless:</span> {formData.cashless_request ? 'Yes' : 'No'}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Diagnosis:</span> {formData.diagnosis || 'N/A'}</div>
                </div>
              </div>

              <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>DOCUMENTS</h3>
                {files.length > 0 ? (
                  <div>{files.length} file(s) uploaded: {files.map(f => f.name).join(', ')}</div>
                ) : (
                  <div>{formData.doctor_name ? 'Manual entry provided' : 'No documents'}</div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button className="btn btn-ghost" onClick={() => setStep(3)}>← Back</button>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="loading-spinner" />
                    Processing...
                  </>
                ) : (
                  '🚀 Submit & Adjudicate'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Result */}
        {step === 5 && result && (
          <div className="animate-scale-in" style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                {(result.decision as string) === 'APPROVED' ? '✅' : 
                 (result.decision as string) === 'REJECTED' ? '❌' : 
                 (result.decision as string) === 'PARTIAL' ? '⚠️' : '🔍'}
              </div>
              <StatusBadge status={result.decision as string} />
            </div>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              Claim {result.claim_id as string}
            </h2>

            <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: (result.approved_amount as number) > 0 ? 'var(--success-light)' : 'var(--danger-light)' }}>
              ₹{((result.approved_amount as number) || 0).toLocaleString()}
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                of ₹{((result.claim_amount as number) || 0).toLocaleString()}
              </span>
            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
              {result.notes as string}
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => navigate(`/claims/${result._id}`)}>
                View Details
              </button>
              <button className="btn btn-ghost" onClick={() => { setStep(1); setResult(null); setFormData({
                member_id: '', member_name: '', treatment_date: '', hospital: '', cashless_request: false,
                claim_amount: '', claim_type: 'consultation', doctor_name: '', doctor_reg: '', diagnosis: '',
                medicines: '', tests_prescribed: '', treatment: '', procedures: '', consultation_fee: '',
                diagnostic_tests_amount: '', medicines_amount: '', test_names: '', previous_claims_same_day: '0',
              }); setFiles([]); setFileTypes([]); }}>
                Submit Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewClaim;
