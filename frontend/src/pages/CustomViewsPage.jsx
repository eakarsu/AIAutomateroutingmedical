import { Stethoscope } from 'lucide-react';
import PatientFlowSankey from '../components/PatientFlowSankey';
import WardOccupancyHeatmap from '../components/WardOccupancyHeatmap';
import ReferralPDF from '../components/ReferralPDF';
import TriageRulesEditor from '../components/TriageRulesEditor';

export default function CustomViewsPage() {
  return (
    <div style={{ padding: 24, background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <Stethoscope size={22} color="#2563eb" />
        <h1 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>Triage Views</h1>
      </div>
      <p style={{ marginTop: 0, marginBottom: 20, color: '#64748b', fontSize: 14 }}>
        Custom views for medical patient routing & triage — visualize flow, monitor ward capacity, generate referrals, and tune triage thresholds.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(540px, 1fr))', gap: 16 }}>
        <PatientFlowSankey />
        <WardOccupancyHeatmap />
        <ReferralPDF />
        <TriageRulesEditor />
      </div>
    </div>
  );
}
