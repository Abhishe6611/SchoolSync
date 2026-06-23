import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import Pagination from "../components/Pagination.jsx";
import SearchBar from "../components/SearchBar.jsx";
import Table from "../components/Table.jsx";
import ImportExportToolbar from "../components/ImportExportToolbar.jsx";
import { formatDate } from "../utils/dateFormatter.js";
import { sanitizeText } from "../utils/inputSanitizer.js";
import CountUp from "../components/CountUp";
import { printReportCard } from "../utils/reportCardGenerator.jsx";

const emptyForm = { name: "", term: "", date: "", class_id: "", max_marks: "", description: "", exam_type: "FA1", subject_code: "" };

export default function Exams() {
  const [activeTab, setActiveTab] = useState("overview"); // overview, calendar, directory, gradebook
  
  // Data State
  const [exams, setExams] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  
  // Gradebook State
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [gradebookExamType, setGradebookExamType] = useState("");
  const [gradebookClassId, setGradebookClassId] = useState("");
  const [gradebookSubjectId, setGradebookSubjectId] = useState("");
  
  const [gradeInputs, setGradeInputs] = useState({});
  const [overallStats, setOverallStats] = useState({});
  const [isSavingGrades, setIsSavingGrades] = useState(false);
  const [gradebookSearch, setGradebookSearch] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
  const [activeType, setActiveType] = useState("FA1");
  const [expandedClasses, setExpandedClasses] = useState({});
  const limit = 10;
  
  // Report Cards State
  const [reportCardClassId, setReportCardClassId] = useState("");
  const [reportCardExamType, setReportCardExamType] = useState("");
  const [reportCardStudents, setReportCardStudents] = useState([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState({});
  
  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const EXAM_TYPES = ["FA1", "FA2", "SA1", "FA3", "FA4", "SA2"];

  const loadReportCardStudents = async () => {
    if (!reportCardClassId || !reportCardExamType) {
      setError("Please select both Class and Exam Type to load students.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/students/?class_id=${reportCardClassId}&limit=1000`);
      const list = res.data.items || res.data;
      list.sort((a, b) => (a.first_name + ' ' + a.last_name).localeCompare(b.first_name + ' ' + b.last_name));
      setReportCardStudents(list);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load students for report cards.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReportCard = async (studentId) => {
    setIsGeneratingReport(prev => ({...prev, [studentId]: true}));
    try {
      const res = await api.get(`/report-cards/${studentId}/${reportCardExamType}`);
      printReportCard(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to generate report card.");
    } finally {
      setIsGeneratingReport(prev => ({...prev, [studentId]: false}));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [exRes, clsRes, subRes] = await Promise.all([
        api.get("/exams/?limit=1000"),
        api.get("/classes/?limit=1000"),
        api.get("/subjects/?limit=1000"),
      ]);
      setExams(exRes.data);
      setClassesList(clsRes.data);
      setSubjectsList(subRes.data);
      setError(null);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : "Failed to load data");
    }
  };

  const classMap = useMemo(() => new Map(classesList.map((c) => [c.id, c.name])), [classesList]);
  const subjectMap = useMemo(() => new Map(subjectsList.map((s) => [s.id, s.name])), [subjectsList]);

  // -------------- DIRECTORY LOGIC --------------
  const typeExams = useMemo(() => exams.filter(ex => ex.exam_type === activeType), [exams, activeType]);
  
  const availableClasses = useMemo(() => {
    const ids = [...new Set(typeExams.map(ex => ex.class_id))];
    return classesList.filter(c => ids.includes(c.id));
  }, [typeExams, classesList]);

  useEffect(() => {
    if (availableClasses.length > 0) {
      setExpandedClasses(prev => {
        if (Object.keys(prev).length === 0) {
          return { [availableClasses[0].id]: true };
        }
        return prev;
      });
    }
  }, [availableClasses]);

  const toggleClass = (classId) => {
    setExpandedClasses(prev => ({ ...prev, [classId]: !prev[classId] }));
  };

  const groupedExams = useMemo(() => {
    const groups = {};
    typeExams.forEach(ex => {
      const term = search.toLowerCase();
      if (search && !ex.name.toLowerCase().includes(term) && !ex.term.toLowerCase().includes(term)) return;
      
      if (!groups[ex.class_id]) groups[ex.class_id] = [];
      groups[ex.class_id].push(ex);
    });
    return groups;
  }, [typeExams, search]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedFiltered = useMemo(() => {
    if (!sortConfig.key) return typeExams;
    return [...typeExams].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = (bVal || "").toLowerCase(); }
      if (aVal === null || aVal === undefined) aVal = "";
      if (bVal === null || bVal === undefined) bVal = "";
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [typeExams, sortConfig]);

  const totalPages = Math.ceil(sortedFiltered.length / limit);
  const paged = sortedFiltered.slice((page - 1) * limit, page * limit);

  const handleBulkAdd = async () => {
    if (!form.class_id || !form.term || !form.date) {
      alert("Please select Class, Term, and Start Date first.");
      return;
    }
    const classSubjects = subjectsList.filter(s => String(s.class_id) === String(form.class_id));
    if (classSubjects.length === 0) {
      alert("No subjects found for this class.");
      return;
    }

    setLoading(true);
    try {
      const payloadBase = {
        term: form.term,
        date: form.date,
        class_id: parseInt(form.class_id),
        max_marks: parseFloat(form.max_marks) || 100,
        description: form.description || "",
        exam_type: form.exam_type,
      };

      for (const sub of classSubjects) {
        await api.post("/exams/", {
          ...payloadBase,
          name: sub.name,
          subject_code: sub.code,
        });
      }
      fetchData();
      setForm(emptyForm);
      setSuccessMsg(`Successfully added ${classSubjects.length} exams.`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      const msg = err.response?.data?.detail;
      const errorStr = typeof msg === 'string' ? msg : (Array.isArray(msg) ? msg[0]?.msg : "Check if all fields are filled.");
      setError("Bulk Add Failed: " + errorStr);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (ex) => {
    setForm({
      id: ex.id,
      name: ex.name || "",
      term: ex.term || "",
      date: ex.date || "",
      class_id: ex.class_id || "",
      max_marks: ex.max_marks || "",
      description: ex.description || "",
      exam_type: ex.exam_type || "FA1",
      subject_code: ex.subject_code || ""
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this exam?")) return;
    try {
      await api.delete(`/exams/${id}`);
      fetchData();
    } catch (err) {
      setError("Delete failed");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/exams/${form.id}`, form);
        setSuccessMsg("Exam updated successfully");
      } else {
        await api.post("/exams/", form);
        setSuccessMsg("Exam created successfully");
      }
      setTimeout(() => setSuccessMsg(""), 3000);
      setForm(emptyForm);
      setIsEditing(false);
      setIsFormOpen(false);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.detail;
      setError(typeof msg === 'string' ? msg : "Action failed");
    }
  };

  const openGradebookForExam = (ex) => {
    setGradebookExamType(ex.exam_type);
    setGradebookClassId(String(ex.class_id));
    const sub = subjectsList.find(s => s.name === ex.name && String(s.class_id) === String(ex.class_id));
    if (sub) {
      setGradebookSubjectId(String(sub.id));
    } else {
      setGradebookSubjectId("");
    }
    setActiveTab("gradebook");
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Subject" },
    { key: "term", label: "Term" },
    { key: "date", label: "Date", render: (row) => formatDate(row.date) },
    { key: "max_marks", label: "Max Marks" },
    {
      key: "actions",
      label: "Actions",
      render: (ex) => (
        <div className="flex items-center gap-3">
          <button onClick={() => openGradebookForExam(ex)} className="text-[13px] font-semibold text-[#059669] hover:text-[#047857] transition-colors">
            Manage Grades
          </button>
          <button onClick={() => handleEdit(ex)} className="text-[13px] font-semibold text-[#4263eb] hover:text-[#3b5bdb] transition-colors">
            Edit
          </button>
          <button onClick={() => handleDelete(ex.id)} className="text-[13px] font-semibold text-red-600 hover:text-red-800 transition-colors">
            Delete
          </button>
        </div>
      ),
    },
  ];

  // -------------- GRADEBOOK LOGIC --------------
  const matchingExamForGradebook = useMemo(() => {
    if (!gradebookExamType || !gradebookClassId || !gradebookSubjectId) return null;
    const subject = subjectsList.find(s => String(s.id) === gradebookSubjectId);
    if (!subject) return null;
    return exams.find(e => 
      e.exam_type === gradebookExamType && 
      String(e.class_id) === gradebookClassId &&
      e.name === subject.name
    );
  }, [gradebookExamType, gradebookClassId, gradebookSubjectId, exams, subjectsList]);

  useEffect(() => {
    if (matchingExamForGradebook && gradebookSubjectId) {
      loadGradebook(matchingExamForGradebook);
    } else {
      setStudents([]);
      setGradeInputs({});
    }
  }, [matchingExamForGradebook, gradebookSubjectId]);

  const loadGradebook = async (exam) => {
    try {
      setError(null);
      setSuccessMsg("");
      if (!exam) return;

      const [stuRes, grdRes] = await Promise.all([
        api.get(`/students/?class_id=${exam.class_id}&limit=1000`),
        api.get(`/grades/?limit=5000`),
      ]);

      const classStudents = (stuRes.data.items || stuRes.data)
        .sort((a, b) => (a.first_name + ' ' + a.last_name).localeCompare(b.first_name + ' ' + b.last_name));
      setStudents(classStudents);

      const relevantGrades = grdRes.data.filter(
        g => g.exam_id === exam.id && g.subject_id === parseInt(gradebookSubjectId)
      );
      setGrades(relevantGrades);

      const termExams = exams.filter(e => e.exam_type === exam.exam_type && String(e.class_id) === String(exam.class_id));
      const termExamIds = termExams.map(e => e.id);

      const initialInputs = {};
      const stats = {};
      classStudents.forEach(student => {
        const existing = relevantGrades.find(g => g.student_id === student.id);
        initialInputs[student.id] = {
          grade_id: existing ? existing.id : null,
          internal_marks: existing && existing.internal_marks !== undefined ? existing.internal_marks : "",
          external_marks: existing && existing.external_marks !== undefined ? existing.external_marks : "",
          remarks: existing?.remarks || ""
        };

        const studentGradesInTerm = grdRes.data.filter(g => g.student_id === student.id && termExamIds.includes(g.exam_id));
        const totalMaxMarks = termExams.reduce((sum, e) => sum + (e.max_marks || 100), 0);
        const totalObtained = studentGradesInTerm.reduce((sum, g) => sum + (g.marks_obtained || 0), 0);
        const percentage = totalMaxMarks > 0 ? ((totalObtained / totalMaxMarks) * 100).toFixed(1) : 0;
        
        stats[student.id] = {
          totalObtained,
          totalMaxMarks,
          percentage
        };
      });
      setGradeInputs(initialInputs);
      setOverallStats(stats);
      
    } catch (err) {
      setError("Failed to load gradebook data");
    }
  };

  const handleGradeInputChange = (studentId, field, value) => {
    setGradeInputs(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
  };

  const handleSaveGrades = async () => {
    if (!matchingExamForGradebook) return;
    setIsSavingGrades(true);
    setError(null);
    setSuccessMsg("");
    try {
      const promises = [];
      const examId = matchingExamForGradebook.id;
      const subjectId = parseInt(gradebookSubjectId);

      for (const student of students) {
        const input = gradeInputs[student.id];
        const intMarks = parseFloat(input.internal_marks) || 0;
        const extMarks = parseFloat(input.external_marks) || 0;
        if (input.internal_marks === "" && input.external_marks === "") continue;

        const payload = {
          exam_id: examId,
          student_id: student.id,
          subject_id: subjectId,
          internal_marks: intMarks,
          external_marks: extMarks,
          marks_obtained: intMarks + extMarks,
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
      setTimeout(() => setSuccessMsg(""), 3000);
      loadGradebook(matchingExamForGradebook);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save some grades");
    } finally {
      setIsSavingGrades(false);
    }
  };

  const gradebookFilteredStudents = students.filter(s => 
    s.first_name.toLowerCase().includes(gradebookSearch.toLowerCase()) || 
    s.last_name.toLowerCase().includes(gradebookSearch.toLowerCase())
  );

  // -------------- OVERVIEW & CALENDAR LOGIC --------------
  const today = new Date();
  const upcomingExams = useMemo(() => exams.filter(e => new Date(e.date) >= today), [exams, today]);
  const pastExams = useMemo(() => exams.filter(e => new Date(e.date) < today), [exams, today]);

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);

    const days = [];
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2 border border-[#f1f3f5] bg-[#f8f9fa] opacity-50"></div>);
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayExams = exams.filter(e => e.date === dateStr);
      const isToday = today.toISOString().split('T')[0] === dateStr;

      days.push(
        <div key={day} className={`p-2 border border-[#f1f3f5] min-h-[120px] flex flex-col ${isToday ? "bg-indigo-50/30" : "bg-white"}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-sm font-bold ${isToday ? "text-indigo-600 bg-indigo-100 rounded-full w-7 h-7 flex items-center justify-center" : "text-[#495057]"}`}>
              {day}
            </span>
            {dayExams.length > 0 && (
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md">
                {dayExams.length}
              </span>
            )}
          </div>
          <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[80px] custom-scrollbar pr-1">
            {dayExams.map(ex => (
              <div key={ex.id} 
                   onClick={() => openGradebookForExam(ex)}
                   className="text-[10px] p-1.5 rounded-md bg-[#f8f9fa] border border-[#e9ecef] text-[#212529] hover:border-indigo-300 hover:bg-white cursor-pointer transition-all shadow-sm group"
                   title={`${ex.name} (${classMap.get(ex.class_id) || ex.class_id})`}
              >
                <div className="font-bold text-indigo-600 truncate">{ex.exam_type}</div>
                <div className="truncate text-[#495057] group-hover:text-[#212529] font-medium">{ex.name}</div>
                <div className="text-[9px] text-[#adb5bd] mt-0.5 truncate">{classMap.get(ex.class_id)}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
          <h3 className="text-xl font-heading font-bold text-[#212529]">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex items-center bg-[#f1f3f5] rounded-lg p-1">
            <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm text-[#495057] transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={() => setCurrentMonth(new Date())} className="px-4 py-1.5 text-xs font-bold rounded-md hover:bg-white hover:shadow-sm text-[#212529] transition-all">
              Today
            </button>
            <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm text-[#495057] transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-0 rounded-xl overflow-hidden border border-[#e9ecef] shadow-sm bg-white">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="p-3 text-center text-[11px] font-bold uppercase tracking-wider text-[#868e96] bg-[#f8f9fa] border-b border-[#e9ecef]">
              {d}
            </div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-slide-in-left">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e7f5ff]">
            <svg className="h-5 w-5 text-[#1c7ed6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-[#212529]">Examinations</h1>
            <p className="text-[13px] text-[#868e96] mt-0.5">Manage exam schedules, grading, and performance.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={() => window.location.href='/students'} 
             className="btn-secondary text-xs flex items-center gap-2 bg-white"
           >
             <svg className="w-4 h-4 text-[#adb5bd]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
             Hall Tickets
           </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-0 border-b animate-slide-up" style={{ borderColor: "var(--color-border)", animationDelay: "60ms", opacity: 0, animationFillMode: "forwards" }}>
        <button type="button" onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all -mb-px ${activeTab === "overview" ? "border-[#212529] text-[#212529]" : "border-transparent text-[#868e96] hover:text-[#495057]"}`}>
          Overview
        </button>
        <button type="button" onClick={() => setActiveTab("calendar")}
          className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all -mb-px ${activeTab === "calendar" ? "border-[#212529] text-[#212529]" : "border-transparent text-[#868e96] hover:text-[#495057]"}`}>
          Calendar Schedule
        </button>
        <button type="button" onClick={() => setActiveTab("directory")}
          className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all -mb-px ${activeTab === "directory" ? "border-[#212529] text-[#212529]" : "border-transparent text-[#868e96] hover:text-[#495057]"}`}>
          Exam Directory
        </button>
        <button type="button" onClick={() => setActiveTab("gradebook")}
          className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all -mb-px ${activeTab === "gradebook" ? "border-[#212529] text-[#212529]" : "border-transparent text-[#868e96] hover:text-[#495057]"}`}>
          Gradebook
        </button>
        <button type="button" onClick={() => setActiveTab("report_cards")}
          className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all -mb-px ${activeTab === "report_cards" ? "border-[#212529] text-[#212529]" : "border-transparent text-[#868e96] hover:text-[#495057]"}`}>
          Report Cards
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-100 flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-auto p-1 rounded-lg hover:bg-red-100 transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700 border border-emerald-100 flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          <span className="flex-1">{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg("")} className="ml-auto p-1 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* ── TAB: OVERVIEW ── */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-slide-up" style={{ animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card !py-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e7f5ff] text-[#1c7ed6]">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <div>
                <p className="text-3xl font-heading font-bold text-[#212529]"><CountUp end={exams.length} /></p>
                <p className="text-[11px] text-[#868e96] font-bold uppercase tracking-wider mt-0.5">Total Scheduled</p>
              </div>
            </div>
            <div className="card !py-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ebfbee] text-[#2b8a3e]">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-3xl font-heading font-bold text-[#212529]"><CountUp end={upcomingExams.length} /></p>
                <p className="text-[11px] text-[#868e96] font-bold uppercase tracking-wider mt-0.5">Upcoming Exams</p>
              </div>
            </div>
            <div className="card !py-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f8f9fa] text-[#495057]">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <p className="text-3xl font-heading font-bold text-[#212529]"><CountUp end={pastExams.length} /></p>
                <p className="text-[11px] text-[#868e96] font-bold uppercase tracking-wider mt-0.5">Completed Exams</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <h3 className="text-base font-bold text-[#212529] mb-4">Upcoming Schedule</h3>
            {upcomingExams.length === 0 ? (
              <p className="text-sm text-[#868e96] py-4">No upcoming exams scheduled.</p>
            ) : (
              <div className="space-y-3">
                {upcomingExams.sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0, 5).map(ex => (
                  <div key={ex.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-[#e9ecef] hover:border-[#1c7ed6] hover:bg-[#f8f9fa] transition-all group">
                    <div className="flex items-start gap-4">
                      <div className="bg-white border border-[#e9ecef] text-[#212529] group-hover:border-[#1c7ed6] group-hover:text-[#1c7ed6] w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold flex-shrink-0 transition-colors shadow-sm">
                        <span className="text-[10px] uppercase">{new Date(ex.date).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-lg leading-tight">{new Date(ex.date).getDate()}</span>
                      </div>
                      <div>
                        <h4 className="text-[15px] font-bold text-[#212529]">{ex.name} <span className="text-[#868e96] font-normal">({ex.exam_type})</span></h4>
                        <p className="text-[13px] text-[#495057] mt-0.5">Class: <span className="font-semibold">{classMap.get(ex.class_id) || ex.class_id}</span> • Max Marks: {ex.max_marks}</p>
                      </div>
                    </div>
                    <div className="mt-4 sm:mt-0">
                      <button onClick={() => openGradebookForExam(ex)} className="text-[13px] font-bold text-[#1c7ed6] bg-[#e7f5ff] px-4 py-2 rounded-lg hover:bg-[#d0ebff] transition-colors">
                        Manage Grades &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {upcomingExams.length > 5 && (
              <button onClick={() => setActiveTab("calendar")} className="mt-4 text-[13px] font-semibold text-[#868e96] hover:text-[#212529] w-full text-center py-2">
                View All in Calendar
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: CALENDAR ── */}
      {activeTab === "calendar" && (
        <div className="animate-slide-up" style={{ animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" }}>
          {renderCalendar()}
        </div>
      )}

      {/* ── TAB: DIRECTORY ── */}
      {activeTab === "directory" && (
        <div className="space-y-4 animate-slide-up" style={{ animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" }}>
          
          {/* Top Control Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#e9ecef] shadow-sm">
            <div className="flex flex-col gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#868e96] w-20 flex-shrink-0">Term / Type</span>
                <div className="flex gap-1 overflow-x-auto hidden-scrollbar pb-1 -mb-1">
                  {EXAM_TYPES.map(type => (
                    <button key={type} onClick={() => { setActiveType(type); setExpandedClasses({}); }} className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${activeType === type ? "bg-[#212529] text-white shadow-sm" : "bg-[#f8f9fa] text-[#868e96] hover:bg-[#e9ecef] hover:text-[#212529]"}`}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#f1f3f5]">
              <SearchBar value={search} onChange={setSearch} placeholder="Search subject..." />
              <button onClick={() => { setForm(emptyForm); setIsEditing(false); setIsFormOpen(true); }} className="btn-primary w-full sm:w-auto whitespace-nowrap flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                New Exam
              </button>
            </div>
          </div>

          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-[#f1f3f5]">
              <div>
                <h3 className="text-base font-bold text-[#212529]">Exam List</h3>
                <p className="text-[13px] text-[#868e96] mt-0.5">Manage and export exam schedules.</p>
              </div>
              <ImportExportToolbar
                data={typeExams.map(r => ({ ...r, class_name: classMap.get(r.class_id) || r.class_id }))}
                columns={[...columns, { key: "class_name", label: "Class" }]}
                filename={`Exams_${activeType}_Export`}
                templateFields={Object.keys(emptyForm)}
                importEndpoint="/exams/import"
                onImportSuccess={fetchData}
              />
            </div>
            
            {availableClasses.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-[#f8f9fa] rounded-full flex items-center justify-center mx-auto mb-4">
                   <svg className="w-8 h-8 text-[#adb5bd]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                </div>
                <p className="text-sm font-bold text-[#495057]">No exams found</p>
                <p className="text-[13px] text-[#868e96] mt-1">There are no exams scheduled for {activeType} in this view.</p>
                <button onClick={() => { setForm(emptyForm); setIsEditing(false); setIsFormOpen(true); }} className="mt-4 text-[#1c7ed6] font-semibold text-[13px] hover:underline">
                  Create one now
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {availableClasses.map(cls => {
                  const classExams = groupedExams[cls.id] || [];
                  if (search && classExams.length === 0) return null;
                  const isExpanded = expandedClasses[cls.id];
                  
                  return (
                    <div key={cls.id} className="border border-[#e9ecef] rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-200">
                      <div 
                        className={`flex items-center justify-between p-4 cursor-pointer hover:bg-[#f8f9fa] transition-colors ${isExpanded ? 'bg-[#f8f9fa] border-b border-[#e9ecef]' : ''}`}
                        onClick={() => toggleClass(cls.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${isExpanded ? 'bg-[#1c7ed6] text-white shadow-sm' : 'bg-[#e7f5ff] text-[#1c7ed6]'}`}>
                            {cls.name.replace(/[^0-9]/g, '') || cls.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-[#212529]">{cls.name}</h4>
                            <p className="text-[11px] font-semibold text-[#868e96]">{classExams.length} Subjects Scheduled</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                           {classExams.length > 0 && !isExpanded && (
                             <div className="flex -space-x-2 hidden sm:flex">
                               {classExams.slice(0, 3).map(ex => (
                                 <span key={ex.id} className="w-7 h-7 rounded-full bg-white border border-[#e9ecef] flex items-center justify-center text-[9px] font-bold text-[#495057] shadow-sm" title={ex.name}>
                                   {ex.name.substring(0, 2).toUpperCase()}
                                 </span>
                               ))}
                               {classExams.length > 3 && (
                                 <span className="w-7 h-7 rounded-full bg-[#f1f3f5] border border-[#e9ecef] flex items-center justify-center text-[9px] font-bold text-[#868e96] shadow-sm">
                                   +{classExams.length - 3}
                                 </span>
                               )}
                             </div>
                           )}
                           <div className={`p-1.5 rounded-full transition-colors ${isExpanded ? 'bg-[#e9ecef]' : 'bg-transparent group-hover:bg-[#e9ecef]'}`}>
                             <svg className={`w-5 h-5 text-[#adb5bd] transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#495057]' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                               <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                             </svg>
                           </div>
                        </div>
                      </div>
                      
                      {isExpanded && classExams.length > 0 && (
                        <div className="p-0 border-t border-[#f1f3f5] overflow-x-auto">
                          <Table columns={columns} data={classExams} onSort={handleSort} sortConfig={sortConfig} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal for Create/Edit Exam */}
      {(isFormOpen || isEditing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#212529]/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-[#e9ecef] sticky top-0 bg-white z-10 rounded-t-2xl">
              <h2 className="text-lg font-bold text-[#212529] flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#e7f5ff] text-[#1c7ed6] flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </div>
                {isEditing ? "Edit Exam Entry" : "Create New Exam"}
              </h2>
              <button type="button" onClick={() => { setIsFormOpen(false); setIsEditing(false); setForm(emptyForm); }} className="p-2 text-[#868e96] hover:bg-[#f1f3f5] rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5">Class <span className="text-red-500">*</span></label>
                  <select className="select-field border-[#1c7ed6] bg-[#e7f5ff]/30 text-[#212529]" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: parseInt(e.target.value) || "" })} required>
                    <option value="">Select Class First</option>
                    {classesList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5">Subject <span className="text-red-500">*</span></label>
                  <select className="select-field" value={form.name} onChange={(e) => {
                    const sub = subjectsList.find(s => s.name === e.target.value);
                    setForm({ ...form, name: e.target.value, subject_code: sub?.code || "" });
                  }} disabled={!form.class_id} required>
                    <option value="">{form.class_id ? "Select Subject" : "Select Class Above"}</option>
                    {subjectsList.filter(s => String(s.class_id) === String(form.class_id)).map(s => <option key={s.id} value={s.name}>{s.name} ({s.code})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5">Academic Term <span className="text-red-500">*</span></label>
                  <input className="input-field" placeholder="e.g. 2024-25" value={form.term} onChange={(e) => setForm({ ...form, term: sanitizeText(e.target.value) })} required minLength={2} maxLength={50} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5">Exam Type <span className="text-red-500">*</span></label>
                  <select className="select-field" value={form.exam_type} onChange={(e) => setForm({ ...form, exam_type: e.target.value })} required>
                    {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5">Date <span className="text-red-500">*</span></label>
                  <input type="date" className="input-field" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5">Max Marks <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" className="input-field" placeholder="100" value={form.max_marks} onChange={(e) => setForm({ ...form, max_marks: parseFloat(e.target.value) || "" })} required min="1" max="1000" />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-[11px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5">Description</label>
                  <input className="input-field" placeholder="Optional details..." value={form.description} onChange={(e) => setForm({ ...form, description: sanitizeText(e.target.value) })} maxLength={255} />
                </div>
              </div>

              <div className="mt-8 pt-5 border-t border-[#e9ecef] flex flex-wrap-reverse sm:flex-nowrap items-center justify-between gap-4">
                <button type="button" onClick={() => { setIsFormOpen(false); setIsEditing(false); setForm(emptyForm); }} className="btn-secondary w-full sm:w-auto">
                  Cancel
                </button>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  {!isEditing && (
                    <button type="button" onClick={() => { handleBulkAdd(); setIsFormOpen(false); }} className="btn-secondary text-[#1c7ed6] border-[#1c7ed6] hover:bg-[#e7f5ff] flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                      Bulk Add Subjects
                    </button>
                  )}
                  <button type="submit" className="btn-primary flex items-center justify-center gap-2 px-6">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {isEditing ? "Save Changes" : "Create Exam"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TAB: GRADEBOOK ── */}
      {activeTab === "gradebook" && (
        <div className="space-y-6 animate-slide-up" style={{ animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" }}>
          <div className="card bg-gradient-to-r from-[#e7f5ff] to-white border border-[#d0ebff]">
            <h2 className="text-lg font-bold text-[#212529] mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#1c7ed6] text-white flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
              </div>
              Gradebook Entry
            </h2>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-[11px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5">Target Exam Type <span className="text-red-500">*</span></label>
                <select className="select-field bg-white shadow-sm" value={gradebookExamType} onChange={e => {
                  setGradebookExamType(e.target.value);
                  setGradebookClassId("");
                  setGradebookSubjectId("");
                }}>
                  <option value="">Select Exam Type</option>
                  {EXAM_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5">Target Class <span className="text-red-500">*</span></label>
                <select className="select-field bg-white shadow-sm" value={gradebookClassId} onChange={e => {
                  setGradebookClassId(e.target.value);
                  setGradebookSubjectId("");
                }} disabled={!gradebookExamType}>
                  <option value="">{gradebookExamType ? "Select Class" : "Select Exam First"}</option>
                  {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5">Target Subject <span className="text-red-500">*</span></label>
                <select className="select-field bg-white shadow-sm" value={gradebookSubjectId} onChange={e => setGradebookSubjectId(e.target.value)} disabled={!gradebookClassId}>
                  <option value="">{gradebookClassId ? "Select Subject" : "Select Class First"}</option>
                  {subjectsList.filter(s => String(s.class_id) === gradebookClassId).map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
              </div>
            </div>
          </div>

          {matchingExamForGradebook && gradebookSubjectId && (
            <div className="card shadow-sm border border-[#e9ecef]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <SearchBar value={gradebookSearch} onChange={setGradebookSearch} placeholder="Filter students..." />
                <button onClick={handleSaveGrades} disabled={isSavingGrades} className="btn-primary flex items-center gap-2 px-6">
                  {isSavingGrades ? (
                    <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div> Saving...</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Save Grades</>
                  )}
                </button>
              </div>

              <div className="relative overflow-x-auto rounded-xl border border-[#e9ecef]">
                <table className="w-full text-left text-sm text-[#212529]">
                  <thead className="bg-[#f8f9fa] text-[11px] font-bold uppercase tracking-wider text-[#868e96]">
                    <tr>
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-4 py-4 text-center">Internal</th>
                      <th className="px-4 py-4 text-center">External</th>
                      <th className="px-4 py-4 text-center">Subject Total (Max: {matchingExamForGradebook?.max_marks})</th>
                      <th className="px-4 py-4 text-center">Term Total</th>
                      <th className="px-4 py-4 text-center whitespace-nowrap">Overall %</th>
                      <th className="px-6 py-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f3f5]">
                    {gradebookFilteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-12 text-center text-[#868e96] font-medium">
                          No students found in this class.
                        </td>
                      </tr>
                    ) : (
                      gradebookFilteredStudents.map(student => {
                        const inputs = gradeInputs[student.id] || {};
                        const currentSubjectMarks = (parseFloat(inputs.internal_marks) || 0) + (parseFloat(inputs.external_marks) || 0);
                        const oldSubjectMarks = grades.find(g => g.student_id === student.id)?.marks_obtained || 0;
                        const dynamicTermTotal = (overallStats[student.id]?.totalObtained || 0) - oldSubjectMarks + currentSubjectMarks;
                        const totalMax = overallStats[student.id]?.totalMaxMarks || 0;
                        const dynamicPercentage = totalMax > 0 ? ((dynamicTermTotal / totalMax) * 100).toFixed(1) : 0;

                        return (
                          <tr key={student.id} className="transition-colors hover:bg-[#f8f9fa]">
                            <td className="whitespace-nowrap px-6 py-3 font-bold text-[#212529]">
                              {student.first_name} {student.last_name}
                            </td>
                            <td className="px-6 py-3 font-mono text-[#868e96] text-xs font-semibold">#{student.id}</td>
                            <td className="px-4 py-3">
                              <input type="number" step="0.1" className="input-field py-1.5 w-20 font-mono text-center bg-white shadow-sm mx-auto" placeholder="Int." value={inputs.internal_marks || ""} onChange={e => handleGradeInputChange(student.id, "internal_marks", e.target.value)} />
                            </td>
                            <td className="px-4 py-3">
                              <input type="number" step="0.1" className="input-field py-1.5 w-20 font-mono text-center bg-white shadow-sm mx-auto" placeholder="Ext." value={inputs.external_marks || ""} onChange={e => handleGradeInputChange(student.id, "external_marks", e.target.value)} />
                            </td>
                            <td className="px-4 py-3 font-bold text-indigo-700 font-mono text-center">
                              {(inputs.internal_marks === "" && inputs.external_marks === "") ? "-" : currentSubjectMarks}
                            </td>
                            <td className="px-4 py-3 font-bold text-blue-700 font-mono text-center whitespace-nowrap">
                              {dynamicTermTotal.toFixed(1)} / {totalMax}
                            </td>
                            <td className="px-4 py-3 font-bold text-[#0ca678] font-mono text-center">
                              {dynamicPercentage}%
                            </td>
                            <td className="px-6 py-3">
                              <input type="text" className="input-field py-1.5 bg-white shadow-sm text-xs" placeholder="Optional remarks" value={inputs.remarks || ""} onChange={e => handleGradeInputChange(student.id, "remarks", e.target.value)} />
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
      )}

      {/* ── TAB: REPORT CARDS ── */}
      {activeTab === "report_cards" && (
        <div className="space-y-6 animate-slide-up" style={{ animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" }}>
          <div className="card p-6 border-l-4 border-indigo-600 bg-indigo-50/30">
            <h3 className="text-xl font-bold font-heading text-[#212529] mb-4">Generate Report Cards</h3>
            <p className="text-sm text-[#495057] mb-6">Select an Exam Term and a Class to load students and generate beautifully formatted A4 report cards.</p>
            
            <div className="flex flex-col sm:flex-row gap-4 items-end mb-6">
              <div className="w-full sm:w-48">
                <label className="block text-xs font-bold text-[#868e96] uppercase tracking-wider mb-2">Exam Term</label>
                <select className="input-field" value={reportCardExamType} onChange={e => setReportCardExamType(e.target.value)}>
                  <option value="">Select Term</option>
                  {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="w-full sm:w-64">
                <label className="block text-xs font-bold text-[#868e96] uppercase tracking-wider mb-2">Select Class</label>
                <select className="input-field" value={reportCardClassId} onChange={e => setReportCardClassId(e.target.value)}>
                  <option value="">Select Class</option>
                  {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button 
                onClick={loadReportCardStudents} 
                disabled={loading || !reportCardClassId || !reportCardExamType}
                className="btn-primary"
              >
                {loading ? "Loading..." : "Load Students"}
              </button>
            </div>
            
            {reportCardStudents.length > 0 && (
              <div className="table-container mt-6">
                <table className="w-full text-left text-sm text-[#495057]">
                  <thead className="bg-[#f8f9fa] text-xs font-bold uppercase tracking-wider text-[#868e96]">
                    <tr>
                      <th className="px-6 py-4 rounded-tl-xl">Student Name</th>
                      <th className="px-6 py-4">Admission No</th>
                      <th className="px-6 py-4 text-right rounded-tr-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f3f5]">
                    {reportCardStudents.map((student) => (
                      <tr key={student.id} className="transition-colors hover:bg-white">
                        <td className="px-6 py-4 font-bold text-[#212529]">
                          {student.first_name} {student.last_name}
                        </td>
                        <td className="px-6 py-4 font-mono text-[#868e96] text-xs font-semibold">#{student.id}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleGenerateReportCard(student.id)}
                            disabled={isGeneratingReport[student.id]}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                          >
                            {isGeneratingReport[student.id] ? (
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            )}
                            Generate PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
