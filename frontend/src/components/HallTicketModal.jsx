import { useState, useEffect } from "react";
import api from "../api/axios";
import { generateHallTicket } from "../utils/hallTicketGenerator";

export default function HallTicketModal({ student, onClose }) {
  const [exams, setExams] = useState([]);
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (student) {
      fetchExams();
    }
  }, [student]);

  const fetchExams = async () => {
    try {
      const res = await api.get(`/exams/?limit=1000`);
      // Determine class_id: either from single student or from the bulk context
      const targetClassId = student?.class_id || student?.targetClassId;
      
      if (!targetClassId) {
        setExams([]);
        setTerms([]);
        return;
      }

      // Filter exams with string conversion to be safe with IDs
      const classExams = res.data.filter(ex => String(ex.class_id) === String(targetClassId));
      setExams(classExams);

      // Extract unique terms (e.g. SA1, FA1)
      const uniqueTerms = [...new Set(classExams.map(ex => ex.exam_type))];
      setTerms(uniqueTerms);
    } catch (err) {
      console.error("Failed to fetch exams", err);
    }
  };

  const handleTermChange = (term) => {
    setSelectedTerm(term);
    const termExams = exams.filter(ex => ex.exam_type === term).map(ex => ({
      id: ex.id,
      name: ex.name,
      date: ex.date
    }));
    setSchedule(termExams);
  };

  const handleDateChange = (index, newDate) => {
    const newSchedule = [...schedule];
    newSchedule[index].date = newDate;
    setSchedule(newSchedule);
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const target = student.isBulk ? student.students : student;
      await generateHallTicket(target, schedule, selectedTerm);
      onClose();
    } catch (err) {
      console.error("Failed to generate hall ticket", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-zoom-in">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-ink">
              {student.isBulk ? "Bulk Hall Ticket Generation" : "Generate Hall Ticket"}
            </h3>
            <p className="text-sm text-muted">
              {student.isBulk 
                ? `Generating for all students in the selected class` 
                : `Select an exam term for ${student.first_name} ${student.last_name}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Select Exam Assessment</label>
            <div className="flex flex-wrap gap-2">
              {terms.length > 0 ? terms.map(t => (
                <button
                  key={t}
                  onClick={() => handleTermChange(t)}
                  className={`px-4 py-2 rounded-xl border-2 transition-all font-bold ${selectedTerm === t ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm" : "border-gray-100 hover:border-gray-300 text-muted"}`}
                >
                  {t}
                </button>
              )) : (
                <p className="text-sm text-red-500 italic">No exams scheduled for this class yet.</p>
              )}
            </div>
          </div>

          {selectedTerm && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-ink">Examination Schedule</h4>
                <span className="text-xs text-muted">You can manually edit dates before generating</span>
              </div>
              <div className="overflow-hidden border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Subject</th>
                      <th className="px-4 py-3 text-left font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {schedule.map((ex, idx) => (
                      <tr key={ex.id}>
                        <td className="px-4 py-3 font-medium text-ink">{ex.name}</td>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            className="input-field py-1"
                            value={ex.date}
                            onChange={(e) => handleDateChange(idx, e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-top flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handleGenerate}
            disabled={!selectedTerm || loading}
            className="btn-primary"
          >
            {loading ? "Generating..." : "Download Hall Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}
