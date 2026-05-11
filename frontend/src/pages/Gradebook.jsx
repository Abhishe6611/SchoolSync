import { useEffect, useState } from "react";
import api from "../api/axios";
import SearchBar from "../components/SearchBar.jsx";

export default function Gradebook() {
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [search, setSearch] = useState("");
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Local state to track input changes before saving
  const [gradeInputs, setGradeInputs] = useState({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [exRes, subRes] = await Promise.all([
        api.get("/exams/?limit=1000"),
        api.get("/subjects/?limit=1000"),
      ]);
      setExams(exRes.data);
      setSubjects(subRes.data);
    } catch (err) {
      setError("Failed to load initial data");
    }
  };

  useEffect(() => {
    if (selectedExam && selectedSubject) {
      loadGradebook();
    } else {
      setStudents([]);
      setGradeInputs({});
    }
  }, [selectedExam, selectedSubject]);

  const loadGradebook = async () => {
    try {
      setError(null);
      setSuccessMsg("");
      const exam = exams.find(e => e.id === parseInt(selectedExam));
      if (!exam) return;

      const [stuRes, grdRes] = await Promise.all([
        api.get(`/students/?limit=1000`), // Ideally filtered by class_id on backend
        api.get(`/grades/?limit=5000`),
      ]);

      const classStudents = stuRes.data.filter(s => s.class_id === exam.class_id);
      setStudents(classStudents);

      const relevantGrades = grdRes.data.filter(
        g => g.exam_id === exam.id && g.subject_id === parseInt(selectedSubject)
      );
      setGrades(relevantGrades);

      // Populate inputs
      const initialInputs = {};
      classStudents.forEach(student => {
        const existing = relevantGrades.find(g => g.student_id === student.id);
        initialInputs[student.id] = {
          grade_id: existing ? existing.id : null,
          marks_obtained: existing ? existing.marks_obtained : "",
          remarks: existing?.remarks || ""
        };
      });
      setGradeInputs(initialInputs);
      
    } catch (err) {
      setError("Failed to load gradebook data");
    }
  };

  const handleInputChange = (studentId, field, value) => {
    setGradeInputs(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMsg("");
    try {
      const promises = [];
      const examId = parseInt(selectedExam);
      const subjectId = parseInt(selectedSubject);

      for (const student of students) {
        const input = gradeInputs[student.id];
        if (input.marks_obtained === "") continue; // Skip empty

        const payload = {
          exam_id: examId,
          student_id: student.id,
          subject_id: subjectId,
          marks_obtained: parseFloat(input.marks_obtained),
          remarks: input.remarks || null
        };

        if (input.grade_id) {
          promises.push(api.put(`/grades/${input.grade_id}`, payload));
        } else {
          promises.push(api.post("/grades/", payload));
        }
      }

      await Promise.all(promises);
      setSuccessMsg("Grades saved successfully!");
      loadGradebook(); // Refresh
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save some grades");
    } finally {
      setIsSaving(false);
    }
  };

  const currentExam = exams.find(e => e.id === parseInt(selectedExam));
  const filteredStudents = students.filter(s => 
    s.first_name.toLowerCase().includes(search.toLowerCase()) || 
    s.last_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="page-header animate-slide-in-left">
        <div className="page-icon">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-ink">Gradebook</h1>
          <p className="text-sm text-muted">Quickly input and manage student marks.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100 flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700 border border-green-100 flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {successMsg}
        </div>
      )}

      <div className="card animate-slide-up" style={{ animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" }}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <select className="select-field" value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
            <option value="">Select Exam</option>
            {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name} ({ex.term})</option>)}
          </select>
          
          <select className="select-field" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
            <option value="">Select Subject</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
          </select>
        </div>
      </div>

      {selectedExam && selectedSubject && (
        <div className="card animate-slide-up" style={{ animationDelay: "200ms", opacity: 0, animationFillMode: "forwards" }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <SearchBar value={search} onChange={setSearch} placeholder="Filter students..." />
            <button 
              onClick={handleSaveAll} 
              disabled={isSaving}
              className="btn-primary flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Save All Grades
                </>
              )}
            </button>
          </div>

          <div className="relative overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm text-ink">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-muted">
                <tr>
                  <th className="px-6 py-4 font-semibold">Student Name</th>
                  <th className="px-6 py-4 font-semibold">Student ID</th>
                  <th className="px-6 py-4 font-semibold">Marks Obtained (Max: {currentExam?.max_marks})</th>
                  <th className="px-6 py-4 font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-muted">
                      No students found in this class.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(student => {
                    const inputs = gradeInputs[student.id] || {};
                    return (
                      <tr key={student.id} className="border-b border-border transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="whitespace-nowrap px-6 py-3 font-medium">
                          {student.first_name} {student.last_name}
                        </td>
                        <td className="px-6 py-3">{student.id}</td>
                        <td className="px-6 py-3">
                          <input
                            type="number"
                            step="0.1"
                            className="input-field py-1.5 w-32"
                            placeholder="Marks"
                            value={inputs.marks_obtained || ""}
                            onChange={e => handleInputChange(student.id, "marks_obtained", e.target.value)}
                          />
                        </td>
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            className="input-field py-1.5"
                            placeholder="Optional remarks"
                            value={inputs.remarks || ""}
                            onChange={e => handleInputChange(student.id, "remarks", e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
