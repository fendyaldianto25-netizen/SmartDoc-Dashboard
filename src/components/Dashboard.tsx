import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  FileText, 
  Upload, 
  BarChart3, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  ChevronRight,
  Info,
  FileSearch,
  LayoutDashboard,
  Sun,
  Moon,
  Menu,
  History,
  Trash2
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { extractTextFromPdf } from '@/src/lib/pdf';
import { processDocument, askQuestion, DocSummary } from '@/src/lib/gemini';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { toast } from 'sonner';

const COLORS = ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'];

interface HistoryItem {
  id: string;
  summary: DocSummary;
  fullText: string;
  chatHistory: { q: string; a: string; chartData?: any }[];
  timestamp: number;
}

export default function Dashboard() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<DocSummary | null>(null);
  const [fullText, setFullText] = useState<string>('');
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<{ q: string; a: string; chartData?: { label: string; value: number }[] }[]>([]);
  const [asking, setAsking] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    // Load from localStorage
    const savedSummary = localStorage.getItem('smartdoc_summary');
    const savedText = localStorage.getItem('smartdoc_text');
    const savedHistory = localStorage.getItem('smartdoc_history');
    
    if (savedSummary && savedText) {
      try {
        setSummary(JSON.parse(savedSummary));
        setFullText(savedText);
      } catch (e) {
        console.error('Failed to parse saved summary');
      }
    }

    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history');
      }
    }
  }, []);

  useEffect(() => {
    if (summary) {
      localStorage.setItem('smartdoc_summary', JSON.stringify(summary));
    }
    if (fullText) {
      localStorage.setItem('smartdoc_text', fullText);
    }
    if (history.length > 0) {
      localStorage.setItem('smartdoc_history', JSON.stringify(history));
    }
  }, [summary, fullText, history]);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [chatHistory, asking]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (selectedFile.type !== 'application/pdf') {
      toast.error('Silakan unggah file PDF');
      return;
    }

    setFile(selectedFile);
    setLoading(true);
    setSummary(null);
    setChatHistory([]);

    const toastId = toast.loading('Mengekstrak teks dari PDF...');
    try {
      const text = await extractTextFromPdf(selectedFile);
      setFullText(text);
      
      toast.loading('Menganalisis konten dengan AI...', { id: toastId });
      const result = await processDocument(text);
      
      setSummary(result);
      
      // Add to history
      const newHistoryItem: HistoryItem = {
        id: Math.random().toString(36).substring(7),
        summary: result,
        fullText: text,
        chatHistory: [],
        timestamp: Date.now()
      };
      setHistory(prev => [newHistoryItem, ...prev.slice(0, 9)]);
      
      toast.success('Dokumen berhasil dianalisis', { id: toastId });
    } catch (error: any) {
      toast.error(error.message || 'Gagal memproses dokumen', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !fullText || asking) return;

    const currentQuestion = question;
    setQuestion('');
    setAsking(true);

    try {
      const { answer, chartData } = await askQuestion(fullText, currentQuestion);
      setChatHistory(prev => [...prev, { q: currentQuestion, a: answer, chartData }]);
    } catch (error) {
      toast.error('Gagal mendapatkan jawaban');
    } finally {
      setAsking(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setSummary(null);
    setFullText('');
    setChatHistory([]);
    localStorage.removeItem('smartdoc_summary');
    localStorage.removeItem('smartdoc_text');
    setActiveTab('overview');
    toast.info('Dashboard telah direset');
  };

  const handleLoadDemo = () => {
    const demoSummary: DocSummary = {
      title: "Prosedur Operasional Standar: Pemeliharaan Infrastruktur IT",
      type: "Procedure",
      summary: "Dokumen ini merinci protokol pemeliharaan rutin untuk infrastruktur IT pusat, mencakup server, jaringan, dan sistem keamanan data untuk memastikan ketersediaan layanan 24/7.",
      keyPoints: [
        "Monitoring suhu dan kelembaban ruang server setiap 4 jam.",
        "Pencadangan data (backup) otomatis dilakukan setiap pukul 00:00 WIB.",
        "Pembaruan patch keamanan sistem operasi dilakukan setiap hari Jumat terakhir setiap bulan.",
        "Audit log akses fisik dan digital dilakukan secara mingguan."
      ],
      simplifiedSteps: [
        "Verifikasi integritas backup data terakhir.",
        "Lakukan inspeksi visual pada perangkat keras dan kabel.",
        "Analisis log performa sistem untuk mendeteksi anomali.",
        "Uji coba sistem failover ke server cadangan (DRC).",
        "Perbarui dokumentasi logbook pemeliharaan."
      ],
      responsibilities: [
        {
          role: "System Administrator",
          tasks: ["Manajemen patch keamanan", "Konfigurasi server", "Pemulihan data kritis"]
        },
        {
          role: "IT Support Specialist",
          tasks: ["Pembersihan fisik rak server", "Manajemen inventaris", "Monitoring harian"]
        }
      ]
    };
    setSummary(demoSummary);
    setFullText("Ini adalah teks demo untuk prosedur pemeliharaan infrastruktur IT...");
    
    // Add to history if not exists
    if (!history.find(h => h.summary.title === demoSummary.title)) {
      const demoItem: HistoryItem = {
        id: 'demo-1',
        summary: demoSummary,
        fullText: "Ini adalah teks demo untuk prosedur pemeliharaan infrastruktur IT...",
        chatHistory: [],
        timestamp: Date.now()
      };
      setHistory(prev => [demoItem, ...prev.slice(0, 9)]);
    }
    
    toast.success("Demo dashboard berhasil dimuat");
  };

  const loadFromHistory = (item: HistoryItem) => {
    setSummary(item.summary);
    setFullText(item.fullText);
    setChatHistory(item.chatHistory);
    setActiveTab('overview');
    toast.success(`Memuat: ${item.summary.title}`);
  };

  const deleteFromHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(h => h.id !== id));
    toast.info('Dokumen dihapus dari riwayat');
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-sky-100 transition-colors duration-300">
      {/* Top Navigation / Header */}
      <nav className="sticky top-0 z-50 w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-4 cursor-pointer group"
            onClick={() => summary ? setActiveTab('overview') : null}
          >
            <div className="w-10 h-10 bg-slate-900 dark:bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200 dark:shadow-sky-900/20 group-hover:scale-110 transition-transform">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">
                Smart<span className="text-sky-500">Doc</span>
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 -mt-1">
                Intelligence Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            {/* Directory & Theme Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-10 h-10 flex items-center justify-center cursor-pointer outline-none"
                >
                  <Menu className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 p-2 rounded-2xl border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl">
                <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Quick Settings
                </DropdownMenuLabel>
                <DropdownMenuItem 
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {theme === 'dark' ? (
                      <Sun className="w-4 h-4 text-sky-400" />
                    ) : (
                      <Moon className="w-4 h-4 text-slate-600" />
                    )}
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </span>
                  </div>
                  <div className="w-8 h-4 bg-slate-100 dark:bg-slate-800 rounded-full relative">
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all ${theme === 'dark' ? 'right-0.5 bg-sky-400' : 'left-0.5'}`} />
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem 
                  onClick={handleLoadDemo}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4 text-sky-500" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Lihat Demo Dashboard
                  </span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-2 bg-slate-100 dark:bg-slate-800" />
                
                <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center justify-between">
                  File Directory
                  <History className="w-3 h-3" />
                </DropdownMenuLabel>
                
                <div className="max-h-64 overflow-y-auto space-y-1 px-1">
                  {history.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-xs text-slate-400 italic">Belum ada riwayat file</p>
                    </div>
                  ) : (
                    history.map((item) => (
                      <DropdownMenuItem 
                        key={item.id}
                        onClick={() => loadFromHistory(item)}
                        className="group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-4 h-4 text-slate-400 group-hover:text-sky-500 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                              {item.summary.title}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(item.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => deleteFromHistory(item.id, e)}
                          className="w-6 h-6 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-500 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="hidden md:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                <span className="text-xs font-bold text-slate-600">AF</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">
          {!summary && !loading ? (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto mt-20 text-center"
            >
              <div className="inline-flex p-4 bg-sky-50 dark:bg-sky-900/20 rounded-3xl mb-8">
                <FileSearch className="w-12 h-12 text-sky-500" />
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
                Selamat Datang di SmartDoc
              </h2>
              <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed mb-10">
                Solusi cerdas untuk menganalisis, merangkum, dan memvisualisasikan dokumen teknis Anda secara instan.
              </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                {[
                  { icon: CheckCircle2, label: "QP Summary", color: "text-green-500" },
                  { icon: FileSearch, label: "WI Visuals", color: "text-blue-500" },
                  { icon: BarChart3, label: "Data Extraction", color: "text-purple-500" }
                ].map((item, i) => (
                  <div key={i} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
                    <item.icon className={`w-5 h-5 ${item.color} mb-2`} />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-12 flex flex-col items-center justify-center gap-4">
                <div className="relative group w-full sm:w-auto">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <Button className="w-full sm:w-auto rounded-2xl px-12 py-7 bg-slate-900 dark:bg-sky-500 hover:bg-slate-800 dark:hover:bg-sky-600 text-white font-bold text-lg gap-3 shadow-xl shadow-slate-200 dark:shadow-sky-900/20 transition-all active:scale-95">
                    <Upload className="w-6 h-6" />
                    Mulai Analisis PDF
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : loading ? (
            <div className="space-y-8 max-w-5xl mx-auto py-20 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-sky-50 dark:bg-sky-900/20 rounded-full flex items-center justify-center animate-pulse">
                  <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Sedang Menganalisis Dokumen</h3>
                  <p className="text-slate-500 dark:text-slate-400">AI sedang membaca dan merangkum konten untuk Anda...</p>
                </div>
              </div>
              <div className="space-y-6 mt-12">
                <Skeleton className="h-40 w-full rounded-3xl" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Skeleton className="h-64 rounded-3xl" />
                  <Skeleton className="h-64 md:col-span-2 rounded-3xl" />
                </div>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Hero Summary Card */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden">
                  <div className="p-8 md:p-10">
                    <div className="flex items-center gap-3 mb-6">
                      <Badge className="bg-slate-900 dark:bg-sky-500 text-white hover:bg-slate-800 dark:hover:bg-sky-600 px-4 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">
                        {summary.type}
                      </Badge>
                      <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        AI Analysis Complete
                      </span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
                      {summary.title}
                    </h2>
                    <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed italic border-l-4 border-sky-500 pl-6">
                      {summary.summary}
                    </p>
                  </div>
                </Card>

                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-slate-900 dark:bg-slate-900 text-white rounded-[2rem] overflow-hidden flex flex-col justify-center p-8">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Quick Stats</h3>
                  <div className="space-y-6">
                    <div>
                      <p className="text-4xl font-light tracking-tighter">{summary.keyPoints.length}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400">Poin Utama</p>
                    </div>
                    <Separator className="bg-slate-800" />
                    <div>
                      <p className="text-4xl font-light tracking-tighter">{summary.simplifiedSteps.length}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400">Langkah Kerja</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Main Content Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                  <TabsList className="bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 w-full md:w-auto overflow-x-auto">
                    <TabsTrigger value="overview" className="rounded-xl px-4 md:px-6 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:data-[state=active]:text-white text-slate-500 font-semibold text-sm whitespace-nowrap">
                      Ringkasan
                    </TabsTrigger>
                    <TabsTrigger value="steps" className="rounded-xl px-4 md:px-6 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:data-[state=active]:text-white text-slate-500 font-semibold text-sm whitespace-nowrap">
                      Langkah
                    </TabsTrigger>
                    <TabsTrigger value="responsibilities" className="rounded-xl px-4 md:px-6 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:data-[state=active]:text-white text-slate-500 font-semibold text-sm whitespace-nowrap">
                      Tugas
                    </TabsTrigger>
                    <TabsTrigger value="qa" className="rounded-xl px-4 md:px-6 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:data-[state=active]:text-white text-slate-500 font-semibold text-sm whitespace-nowrap">
                      Tanya Jawab
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <Button variant="ghost" size="sm" className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white" onClick={() => window.print()}>
                      <FileText className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20" onClick={handleReset}>
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>

                <TabsContent value="overview" className="mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {summary.keyPoints.map((point, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-md transition-shadow group"
                      >
                        <div className="flex gap-4">
                          <span className="text-4xl font-black text-slate-100 dark:text-slate-800 group-hover:text-sky-100 dark:group-hover:text-sky-900/30 transition-colors">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed pt-2">
                            {point}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="steps" className="mt-0">
                  <Card className="border-none shadow-sm bg-white dark:bg-slate-900 rounded-[2rem] p-8 md:p-12">
                    <div className="space-y-12 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-slate-100 dark:before:bg-slate-800">
                      {summary.simplifiedSteps.map((step, i) => (
                        <div key={i} className="relative flex gap-8">
                          <div className="z-10 w-10 h-10 rounded-full bg-white dark:bg-slate-900 border-2 border-sky-500 flex items-center justify-center shadow-sm">
                            <span className="text-xs font-bold text-sky-600 dark:text-sky-400">{i + 1}</span>
                          </div>
                          <div className="flex-1 pt-1">
                            <p className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">{step}</p>
                            <Separator className="w-12 h-1 bg-sky-100 dark:bg-sky-900/30 rounded-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="responsibilities" className="mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {summary.responsibilities.map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-sm"
                      >
                        <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center">
                            <Info className="w-4 h-4 text-sky-500" />
                          </div>
                          {item.role}
                        </h4>
                        <ul className="space-y-3">
                          {item.tasks.map((task, j) => (
                            <li key={j} className="flex gap-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                              {task}
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="qa" className="mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-2 border-none shadow-sm bg-white dark:bg-slate-900 rounded-[2rem] flex flex-col h-[500px] overflow-hidden">
                      <div className="p-6 border-b border-slate-50 dark:border-slate-800 shrink-0">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                          AI Assistant
                        </h3>
                      </div>
                      <ScrollArea ref={scrollRef} className="flex-1 min-h-0 p-6">
                        <div className="space-y-8 pb-6">
                          {chatHistory.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center py-12">
                              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 mx-auto">
                                <Info className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                              </div>
                              <p className="text-slate-400 dark:text-slate-500 text-sm italic font-medium">Tanyakan detail spesifik mengenai dokumen ini.</p>
                            </div>
                          )}
                          {chatHistory.map((chat, i) => (
                            <div key={i} className="space-y-6">
                              <div className="flex justify-end">
                                <div className="bg-slate-900 dark:bg-sky-500 text-white rounded-2xl rounded-tr-none px-6 py-3 max-w-[85%] text-sm shadow-lg">
                                  {chat.q}
                                </div>
                              </div>
                              <div className="flex justify-start">
                                <div className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl rounded-tl-none px-6 py-4 max-w-[85%] text-sm leading-relaxed shadow-sm border border-slate-100 dark:border-slate-700">
                                  <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                                    <ReactMarkdown
                                      components={{
                                        p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-slate-600 dark:text-slate-400">{children}</p>,
                                        ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-slate-600 dark:text-slate-400">{children}</ul>,
                                        ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-slate-600 dark:text-slate-400">{children}</ol>,
                                        li: ({ children }) => <li className="pl-1">{children}</li>,
                                        strong: ({ children }) => <strong className="font-bold text-slate-900 dark:text-white">{children}</strong>,
                                        h1: ({ children }) => <h1 className="text-base font-bold text-slate-900 dark:text-white mb-2 mt-3">{children}</h1>,
                                        h2: ({ children }) => <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1 mt-2">{children}</h2>,
                                      }}
                                    >
                                      {chat.a}
                                    </ReactMarkdown>
                                  </div>
                                  {chat.chartData && (
                                    <div className="mt-4 h-44 w-full bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800 shadow-inner">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chat.chartData}>
                                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                                          <XAxis dataKey="label" hide />
                                          <YAxis hide />
                                          <Tooltip 
                                            contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '10px', backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', color: theme === 'dark' ? '#ffffff' : '#000000', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                          />
                                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {chat.chartData.map((_, index) => (
                                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                          </Bar>
                                        </BarChart>
                                      </ResponsiveContainer>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          {asking && (
                            <div className="flex justify-start">
                              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl rounded-tl-none px-5 py-3 w-40 h-12 flex items-center gap-2 border border-slate-100 dark:border-slate-700">
                                <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-800 shrink-0">
                        <form onSubmit={handleAskQuestion} className="flex gap-2">
                          <Input 
                            placeholder="Tanyakan sesuatu..." 
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            disabled={asking}
                            className="bg-slate-50 dark:bg-slate-800 border-none shadow-inner rounded-xl h-11 px-4 focus-visible:ring-sky-500 text-sm dark:text-white"
                          />
                          <Button 
                            type="submit" 
                            disabled={asking || !question.trim()}
                            className="h-11 w-11 rounded-xl bg-slate-900 dark:bg-sky-500 hover:bg-slate-800 dark:hover:bg-sky-600 shadow-lg transition-all active:scale-95 shrink-0"
                          >
                            {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-5 h-5 text-white" />}
                          </Button>
                        </form>
                      </div>
                    </Card>

                    <Card className="border-none shadow-sm bg-sky-50/50 dark:bg-sky-900/10 rounded-[2rem] p-8 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400 mb-6">Document Context</h4>
                        <div className="space-y-4 mb-8">
                          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Title</p>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-2">{summary.title}</p>
                          </div>
                          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Key Points</p>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{summary.keyPoints.length} Points identified</p>
                          </div>
                        </div>
                        
                        <h4 className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400 mb-4">Suggested Questions</h4>
                        <div className="space-y-3">
                          {[
                            "Siapa penanggung jawab dokumen ini?",
                            "Apa tujuan utama prosedur ini?",
                            "Sebutkan langkah-langkah kritikal."
                          ].map((q, i) => (
                            <button
                              key={i}
                              onClick={() => setQuestion(q)}
                              className="w-full text-left p-4 bg-white dark:bg-slate-900 rounded-2xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:shadow-md transition-all border border-slate-100 dark:border-slate-800"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        onClick={() => setActiveTab('overview')}
                        className="mt-6 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/30 rounded-xl font-bold text-xs uppercase tracking-widest"
                      >
                        <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
                        Back to Dashboard
                      </Button>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-30 grayscale dark:invert">
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-xs font-black tracking-tighter uppercase">SmartDoc</span>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              © 2026 SmartDoc Dashboard • Enterprise Intelligence
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-sky-500 mt-1">
              Powered by FnD
            </p>
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Privacy</a>
            <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
