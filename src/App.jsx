import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ChordStaff from './components/ChordStaff';
import katex from 'katex';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// ... Icons ...
const MusicIcon = () => (
    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
);

const EditIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
);

const Latex = ({ children, className = "" }) => {
    const containerRef = React.useRef(null);
    useEffect(() => {
        if (containerRef.current) {
            katex.render(children, containerRef.current, { throwOnError: false, displayMode: false });
        }
    }, [children]);
    return <span ref={containerRef} className={className} />;
};

function App() {
    // 在 Vercel 生产环境中，后端部署在 /api 下，使用相对路径即可避免跨域和硬编码
    const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:8000/api';

    const [activeTab, setActiveTab] = useState('progression');

    // Common Data
    const [availableKeys, setAvailableKeys] = useState([]);
    const [allChordTypes, setAllChordTypes] = useState([]);
    const roots = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

    // Analysis State
    const [selectedKey, setSelectedKey] = useState('C');
    const [chordType, setChordType] = useState('triad');
    const [keyData, setKeyData] = useState(null);

    // Dictionary State
    const [dictRoot, setDictRoot] = useState('C');
    const [dictType, setDictType] = useState('Major');
    const [dictResult, setDictResult] = useState(null);

    // Progression State
    const [progKey, setProgKey] = useState('C');
    const [templates, setTemplates] = useState([]);
    const [numerals, setNumerals] = useState(["I", "vi", "IV", "V"]);
    const [progressionData, setProgressionData] = useState([]);

    // Progression Editing State
    const [editingIndex, setEditingIndex] = useState(-1); // Index of chord being edited
    const [editRoot, setEditRoot] = useState('C');
    const [editType, setEditType] = useState('Major');

    const progressionRef = useRef(null); // Ref for PDF export

    useEffect(() => {
        fetchKeys();
        fetchChordTypes();
        fetchTemplates();

        analyzeKey('C', 'triad');
        calculateChord('C', 'Major');
        updateProgression('C', ["I", "vi", "IV", "V"]);
    }, []);

    // --- Fetchers ---
    const fetchKeys = async () => {
        try { const res = await axios.get(`${API_BASE}/keys`); setAvailableKeys(res.data); } catch (e) { }
    };
    const fetchChordTypes = async () => {
        try { const res = await axios.get(`${API_BASE}/chord_types`); setAllChordTypes(res.data); } catch (e) { }
    }
    const fetchTemplates = async () => {
        try { const res = await axios.get(`${API_BASE}/progressions/templates`); setTemplates(res.data); } catch (e) { }
    }

    // --- Analysis Logic ---
    const analyzeKey = async (key, type) => {
        try {
            setSelectedKey(key);
            if (type) setChordType(type);
            const res = await axios.get(`${API_BASE}/analyze/${encodeURIComponent(key)}?chord_type=${type || chordType}`);
            setKeyData(res.data);
        } catch (e) { }
    };

    // --- Dictionary Logic ---
    const calculateChord = async (root, type) => {
        try {
            setDictRoot(root);
            setDictType(type);
            const res = await axios.get(`${API_BASE}/calculate_chord`, { params: { root, type } });
            setDictResult(res.data);
        } catch (e) { }
    }

    // --- Progression Logic ---
    const updateProgression = async (key, nums) => {
        try {
            setProgKey(key);
            setNumerals(nums);
            // If numerals contain custom chord objects (not just Roman strings), handle that?
            // Current backend expects roman numerals.
            // If we want arbitrary chords, we need a different approach.
            // Actually, let's stick to the current flow: 
            // Backend converts Roman -> Chord.
            // BUT user wants to change Root/Type freely. 
            // So we should probably store the progression as a list of {root, type} objects 
            // INSTEAD of just Roman numerals, OR have a mixed mode.

            // Let's modify the frontend logic:
            // We maintain `progressionData` as the source of truth for display.
            // `numerals` is just for the template/roman input.
            // When we edit a chord manually, we update `progressionData` directly by calling calculate_chord for that index.

            const res = await axios.post(`${API_BASE}/progressions/convert`, { key, numerals: nums });
            setProgressionData(res.data);
        } catch (e) { console.error(e); }
    };

    const applyTemplate = (tmpl) => {
        updateProgression(progKey, tmpl.numerals);
    };

    const smartGenerate = async () => {
        try {
            const res = await axios.post(`${API_BASE}/progressions/smart_generate`, { key: progKey, length: 4 });
            setProgressionData(res.data);
            setNumerals(res.data.map(c => c.numeral));
        } catch (e) { }
    };

    const handleNumeralChange = (idx, val) => {
        // This updates via Roman numeral re-fetching
        const newNumerals = [...numerals];
        newNumerals[idx] = val;
        setNumerals(newNumerals); // Update state
        // Re-fetch just this chord or whole progression? Whole is safer for key context.
        updateProgression(progKey, newNumerals);
    };

    // Manual Chord Editor
    const openEditor = (index, currentChord) => {
        setEditingIndex(index);
        setEditRoot(currentChord.root || 'C');
        // Map backend type name to dropdown if needed, usually matches
        setEditType(currentChord.type || 'Major');
    };

    const saveChordEdit = async () => {
        try {
            const res = await axios.get(`${API_BASE}/calculate_chord`, {
                params: { root: editRoot, type: editType }
            });

            const newData = [...progressionData];
            newData[editingIndex] = {
                ...res.data,
                numeral: "Custom" // Mark as manually edited
            };
            setProgressionData(newData);
            setEditingIndex(-1);

            // Update numerals array just to keep length in sync, though content diverges
            const newNumerals = [...numerals];
            newNumerals[editingIndex] = "Custom";
            setNumerals(newNumerals);
        } catch (e) { console.error(e); }
    };

    const addChord = () => {
        // Add a default C Major
        const newNumerals = [...numerals, "I"];
        updateProgression(progKey, newNumerals);
    };

    const removeChord = (idx) => {
        const newNumerals = numerals.filter((_, i) => i !== idx);
        // Also remove from data
        const newData = progressionData.filter((_, i) => i !== idx);
        setProgressionData(newData);
        setNumerals(newNumerals);
    };

    // Export PDF
    const exportPDF = async (simpleMode = false) => {
        if (!progressionRef.current) return;

        try {
            const element = progressionRef.current;

            // Optional: Apply simple mode styles temporarily
            if (simpleMode) {
                element.classList.add('pdf-simple-mode');
            }

            const canvas = await html2canvas(element, {
                scale: 2, // Higher res
                backgroundColor: '#ffffff',
                useCORS: true
            });

            if (simpleMode) {
                element.classList.remove('pdf-simple-mode');
            }

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.setFontSize(20);
            pdf.text("Chord Progression", 10, 15);
            pdf.setFontSize(10);
            pdf.text(`Key: ${progKey} | Generated by Music Theory App`, 10, 22);

            pdf.addImage(imgData, 'PNG', 0, 30, imgWidth, imgHeight);
            pdf.save(`progression-${progKey}-${simpleMode ? 'simple' : 'full'}.pdf`);
        } catch (err) {
            console.error("PDF Export failed", err);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Navigation */}
            <nav className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                                <MusicIcon />
                            </div>
                            <span className="text-white text-xl font-bold tracking-wider hidden sm:block">乐理大师</span>
                        </div>

                        <div className="flex bg-black/20 rounded-lg p-1 overflow-x-auto">
                            {[
                                { id: 'key_analysis', label: '调性分析' },
                                { id: 'progression', label: '和弦走向 (Jam)' },
                                { id: 'chord_dictionary', label: '万能字典' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow' : 'text-white/80 hover:text-white'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* ========================================================= */}
                {/* MODE: PROGRESSION */}
                {/* ========================================================= */}
                {activeTab === 'progression' && (
                    <div className="animate-fade-in space-y-8">
                        {/* Control Bar */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <div className="flex flex-col xl:flex-row items-center justify-between gap-6">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-800">即兴伴奏走向</h1>
                                    <p className="text-slate-500 mt-1">选择模板或自动生成，支持任意转调与导出</p>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 justify-center xl:justify-end w-full xl:w-auto">
                                    {/* Key Select */}
                                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                                        <span className="px-3 text-slate-500 font-bold text-xs uppercase">Key</span>
                                        <select
                                            value={progKey}
                                            onChange={(e) => updateProgression(e.target.value, numerals)}
                                            className="bg-transparent border-none font-bold text-indigo-600 text-lg focus:ring-0 cursor-pointer"
                                        >
                                            {availableKeys.map(k => <option key={k} value={k}>{k}</option>)}
                                        </select>
                                    </div>

                                    {/* Template Select */}
                                    <select
                                        onChange={(e) => {
                                            if (e.target.value) applyTemplate(JSON.parse(e.target.value));
                                        }}
                                        className="bg-white border border-slate-200 text-slate-700 py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[200px]"
                                    >
                                        <option value="">-- 经典走向 --</option>
                                        {templates.map((t, i) => (
                                            <option key={i} value={JSON.stringify(t)}>{t.name}</option>
                                        ))}
                                    </select>

                                    {/* Buttons */}
                                    <button
                                        onClick={smartGenerate}
                                        className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:shadow-lg transition-all whitespace-nowrap"
                                    >
                                        智能生成
                                    </button>

                                    <div className="h-8 w-px bg-slate-200 mx-2"></div>

                                    <button
                                        onClick={() => exportPDF(false)}
                                        className="text-slate-600 hover:text-indigo-600 font-medium px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 whitespace-nowrap"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        导出五线谱
                                    </button>
                                    <button
                                        onClick={() => exportPDF(true)}
                                        className="text-slate-600 hover:text-indigo-600 font-medium px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 whitespace-nowrap"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        导出简谱(名)
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Progression Display (Ref for Export) */}
                        <div ref={progressionRef} className="p-4 bg-slate-50/50 rounded-xl">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                {progressionData.map((chord, index) => (
                                    <div key={index} className={`relative bg-white rounded-xl border-2 shadow-sm hover:shadow-md transition-all group ${editingIndex === index ? 'border-indigo-500 ring-4 ring-indigo-100' : 'border-transparent hover:border-indigo-500'}`}>

                                        {/* Remove Button (Hide in PDF) */}
                                        <button
                                            onClick={() => removeChord(index)}
                                            data-html2canvas-ignore
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-sm z-10"
                                        >
                                            &times;
                                        </button>

                                        {editingIndex === index ? (
                                            // === Editor Mode ===
                                            <div className="p-4 z-20 relative bg-white rounded-xl">
                                                <label className="text-xs font-bold text-slate-400 uppercase">Edit Chord</label>
                                                <div className="flex gap-2 mt-2 mb-4">
                                                    <select
                                                        value={editRoot}
                                                        onChange={(e) => setEditRoot(e.target.value)}
                                                        className="w-1/3 p-2 border rounded font-bold text-indigo-700"
                                                    >
                                                        {roots.map(r => <option key={r} value={r}>{r}</option>)}
                                                    </select>
                                                    <select
                                                        value={editType}
                                                        onChange={(e) => setEditType(e.target.value)}
                                                        className="w-2/3 p-2 border rounded text-sm"
                                                    >
                                                        {allChordTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={saveChordEdit} className="flex-1 bg-indigo-600 text-white py-2 rounded font-bold text-xs">Done</button>
                                                    <button onClick={() => setEditingIndex(-1)} className="flex-1 bg-slate-200 text-slate-600 py-2 rounded font-bold text-xs">Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            // === Display Mode ===
                                            <div className="p-4 text-center cursor-pointer" onClick={() => openEditor(index, chord)}>
                                                {/* Edit Hint */}
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-50">
                                                    <EditIcon />
                                                </div>

                                                {/* Roman Numeral Input */}
                                                <input
                                                    value={chord.numeral}
                                                    onClick={(e) => e.stopPropagation()} // Prevent opening editor when typing roman
                                                    onChange={(e) => handleNumeralChange(index, e.target.value)}
                                                    className="w-full text-center text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none bg-transparent mb-2"
                                                />

                                                {/* Chord Name */}
                                                <div className="text-3xl font-bold text-slate-800 mb-2">
                                                    <Latex>{chord.latex}</Latex>
                                                </div>

                                                {/* Mini Staff (Hide in Simple Mode PDF) */}
                                                <div className="flex justify-center transform scale-90 h-[160px] items-center pdf-staff-container">
                                                    <ChordStaff keys={chord.vexflow_keys} width={100} height={160} />
                                                </div>

                                                {/* Notes */}
                                                <p className="text-xs text-slate-400 font-mono mt-2">{chord.notes.join('-')}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Add Button (Hide in PDF) */}
                                <button
                                    onClick={addChord}
                                    data-html2canvas-ignore
                                    className="border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center p-6 text-slate-400 hover:text-indigo-500 hover:border-indigo-500 hover:bg-indigo-50 transition-all min-h-[200px]"
                                >
                                    <span className="text-4xl font-light">+</span>
                                </button>
                            </div>
                        </div>

                        {/* PDF Style overrides */}
                        <style>{`
                    .pdf-simple-mode .pdf-staff-container {
                        display: none;
                    }
                    .pdf-simple-mode .text-3xl {
                        font-size: 4rem; /* Bigger text for chord names in simple mode */
                        padding: 40px 0;
                    }
                `}</style>
                    </div>
                )}

                {/* ... Other Tabs (Key Analysis / Dictionary) ... */}
                {activeTab === 'key_analysis' && (
                    <>
                        {/* 顶部控制区 */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">调性分析</h1>
                                <p className="text-slate-500 mt-1">查看某个调内的所有顺阶和弦</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex bg-slate-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => analyzeKey(selectedKey, 'triad')}
                                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${chordType === 'triad' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            三和弦
                                        </button>
                                        <button
                                            onClick={() => analyzeKey(selectedKey, 'seventh')}
                                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${chordType === 'seventh' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            七和弦
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <label className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Key:</label>
                                    <div className="relative">
                                        <select
                                            value={selectedKey}
                                            onChange={(e) => analyzeKey(e.target.value)}
                                            className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium text-lg min-w-[140px] cursor-pointer hover:bg-slate-100 transition-colors"
                                        >
                                            {availableKeys.map(k => (
                                                <option key={k} value={k}>{k} Major</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {keyData && (
                            <div className="space-y-10 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">关系小调</p>
                                        <p className="text-3xl font-extrabold text-slate-800">{keyData.relative_minor}</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">调号</p>
                                        <div className="flex items-baseline gap-2">
                                            <p className="text-3xl font-extrabold text-slate-800">{keyData.signature === '0' ? 'C Major' : keyData.signature}</p>
                                            <span className="text-sm text-slate-500 font-medium">{keyData.signature === '0' ? '无升降号' : keyData.signature.includes('#') ? '升号' : '降号'}</span>
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">音阶</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {keyData.scale.map((note, i) => (
                                                <span key={i} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-sm border border-slate-200">{note}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-6 border-l-4 border-indigo-500 pl-4">顺阶和弦 (Diatonic Chords)</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {keyData.chords.map((chord, index) => (
                                            <div key={index} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                                                <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                                    <span className="flex items-center justify-center w-12 h-8 rounded-lg bg-indigo-600 text-white font-serif font-bold text-md shadow-indigo-200 shadow-md">{chord.degree}</span>
                                                    <div className="font-bold text-slate-700 text-xl group-hover:text-indigo-600 transition-colors">
                                                        <Latex>{chord.latex}</Latex>
                                                    </div>
                                                </div>
                                                <div className="p-4 flex justify-center bg-white relative min-h-[140px]">
                                                    <div className="opacity-50 absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>
                                                    <div className="relative z-10 flex items-center transform scale-110">
                                                        <ChordStaff keys={chord.vexflow_keys} width={140} height={140} />
                                                    </div>
                                                </div>
                                                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
                                                    <div className="flex justify-center gap-2 flex-wrap">
                                                        {chord.notes.map((n, idx) => (
                                                            <span key={idx} className="text-sm font-mono font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">{n}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'chord_dictionary' && (
                    <div className="animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-8">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-800">万能和弦字典</h1>
                                    <p className="text-slate-500 mt-2">任意组合根音与和弦类型，查询其构成音</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Controls */}
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">根音 (Root)</label>
                                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                                            {roots.map(r => (
                                                <button
                                                    key={r}
                                                    onClick={() => calculateChord(r, dictType)}
                                                    className={`py-2 rounded-lg font-bold text-sm transition-all ${dictRoot === r ? 'bg-indigo-600 text-white shadow-md scale-105' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">和弦类型 (Type)</label>
                                        <select
                                            value={dictType}
                                            onChange={(e) => calculateChord(dictRoot, e.target.value)}
                                            className="block w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-lg font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            {allChordTypes.map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Result Preview */}
                                <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 flex flex-col items-center justify-center min-h-[300px]">
                                    {dictResult ? (
                                        <div className="text-center w-full">
                                            <div className="mb-6">
                                                <span className="inline-block text-6xl font-bold text-slate-800 mb-2">
                                                    <Latex>{dictResult.latex}</Latex>
                                                </span>
                                                <p className="text-slate-500 font-medium">{dictResult.name}</p>
                                            </div>

                                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 inline-block">
                                                <div className="transform scale-125 origin-center">
                                                    <ChordStaff keys={dictResult.vexflow_keys} width={200} height={160} />
                                                </div>
                                            </div>

                                            <div className="flex justify-center gap-3 flex-wrap">
                                                {dictResult.notes.map((n, idx) => (
                                                    <span key={idx} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold text-lg shadow-sm">
                                                        {n}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-slate-400">Select a root and type to see the chord.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <footer className="bg-white border-t border-slate-200 py-8 mt-12">
                <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
                    <p>© 2024 Music Theory App. Designed for Musicians.</p>
                </div>
            </footer>
        </div>
    );
}

export default App;
