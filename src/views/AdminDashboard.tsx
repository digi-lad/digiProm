import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BarChart3, 
  Ticket, 
  Settings2, 
  Search, 
  Bell, 
  Moon, 
  TrendingUp, 
  Vote, 
  Ticket as TicketIcon, 
  AlertTriangle,
  PlusCircle,
  Filter,
  Sparkles,
  X,
  Database,
  LogOut,
  Trash2
} from 'lucide-react';
import { motion } from 'motion/react';
import { collection, onSnapshot, doc, updateDoc, setDoc, writeBatch, deleteDoc, addDoc, deleteField } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { KINGS, QUEENS } from '../constants';
import { Candidate } from '../types';

interface TicketData {
  code: string;
  status: 'UNUSED' | 'USED';
  name: string;
  type: string;
  className: string;
}

export default function AdminDashboard() {
  const { clearSession } = useAuth();
  const [activeTab, setActiveTab] = useState<'CANDIDATES' | 'TICKETS'>('CANDIDATES');
  const [isBlindMode, setIsBlindMode] = useState(true);
  const [pollEndTime, setPollEndTime] = useState<number | null>(null);
  const [pollDurationMinutes, setPollDurationMinutes] = useState(5);
  const [countdownString, setCountdownString] = useState('');
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [editForm, setEditForm] = useState({ name: '', title: '', imageUrl: '', role: 'KING' as 'KING' | 'QUEEN' });
  const [isAddingTicket, setIsAddingTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState({ name: '', type: 'Học sinh', className: '' });
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'USED' | 'UNUSED'>('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketData | null>(null);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);

  useEffect(() => {
    const unsubCandidates = onSnapshot(collection(db, 'candidates'), (snapshot) => {
      const cands: Candidate[] = [];
      snapshot.forEach((doc) => {
        cands.push({ id: doc.id, ...doc.data() } as Candidate);
      });
      // Sort by votes descending
      cands.sort((a, b) => b.votes - a.votes);
      setCandidates(cands);
    });

    const unsubTickets = onSnapshot(collection(db, 'tickets'), (snapshot) => {
      const tks: TicketData[] = [];
      snapshot.forEach((doc) => {
        tks.push(doc.data() as TicketData);
      });
      setTickets(tks);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'system'), (docSnap) => {
      if (docSnap.exists()) {
        setIsBlindMode(docSnap.data().isBlindMode ?? true);
        setPollEndTime(docSnap.data().pollEndTime ?? null);
      }
    });

    return () => {
      unsubCandidates();
      unsubTickets();
      unsubSettings();
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pollEndTime && pollEndTime > Date.now()) {
      interval = setInterval(() => {
        const remaining = pollEndTime - Date.now();
        if (remaining <= 0) {
          setCountdownString('00:00');
          setPollEndTime(null);
        } else {
          const m = Math.floor(remaining / 60000).toString().padStart(2, '0');
          const s = Math.floor((remaining % 60000) / 1000).toString().padStart(2, '0');
          setCountdownString(`${m}:${s}`);
        }
      }, 1000);
    } else {
      setCountdownString('');
    }
    return () => clearInterval(interval);
  }, [pollEndTime]);

  const toggleBlindMode = async () => {
    try {
      await setDoc(doc(db, 'settings', 'system'), { isBlindMode: !isBlindMode }, { merge: true });
    } catch (error) {
      console.error("Error toggling blind mode:", error);
    }
  };

  const startPoll = async () => {
    try {
      const endTime = Date.now() + pollDurationMinutes * 60000;
      await setDoc(doc(db, 'settings', 'system'), { pollEndTime: endTime }, { merge: true });
    } catch (error) {
      console.error("Error starting poll:", error);
    }
  };

  const stopPoll = async () => {
    try {
      await setDoc(doc(db, 'settings', 'system'), { pollEndTime: null }, { merge: true });
    } catch (error) {
      console.error("Error stopping poll:", error);
    }
  };

  const handleResetAll = async () => {
    setShowResetConfirm(false);
    try {
      const batch = writeBatch(db);
      let opCount = 0;
      
      for (const ticket of tickets) {
        batch.update(doc(db, 'tickets', ticket.code), {
          status: 'UNUSED',
          usedBy: deleteField(),
          votedForKings: deleteField(),
          votedForQueens: deleteField()
        });
        opCount++;
      }

      for (const candidate of candidates) {
        batch.update(doc(db, 'candidates', candidate.id), {
          votes: 0
        });
        opCount++;
      }

      if (opCount > 500) {
        alert("Cảnh báo: Tổng số lượng vượt quá 500. Chỉ 500 cập nhật đầu tiên sẽ được áp dụng trong đợt này.");
      }
      
      await batch.commit();
      
      setAlertMessage("Tất cả dữ liệu đã được đặt lại thành công.");
      setTimeout(() => setAlertMessage(null), 3000);
    } catch (error) {
      console.error("Error resetting data:", error);
      alert("Đặt lại dữ liệu thất bại. Kiểm tra console để biết chi tiết.");
    }
  };

  const handleEditClick = (c: Candidate) => {
    setEditingCandidate(c);
    setIsAddingCandidate(false);
    setEditForm({ name: c.name, title: c.title, imageUrl: c.imageUrl, role: c.role });
  };

  const handleAddClick = () => {
    setEditingCandidate(null);
    setIsAddingCandidate(true);
    setEditForm({ name: '', title: '', imageUrl: '', role: 'KING' });
  };

  const handleDeleteCandidate = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'candidates', id));
    } catch (error) {
      console.error("Error deleting candidate:", error);
    }
  };

  const handleSaveCandidate = async () => {
    try {
      if (isAddingCandidate) {
        await addDoc(collection(db, 'candidates'), {
          ...editForm,
          votes: 0
        });
      } else if (editingCandidate) {
        await updateDoc(doc(db, 'candidates', editingCandidate.id), {
          name: editForm.name,
          title: editForm.title,
          imageUrl: editForm.imageUrl,
          role: editForm.role
        });
      }
      setEditingCandidate(null);
      setIsAddingCandidate(false);
    } catch (error) {
      console.error("Error saving candidate:", error);
    }
  };

  const generateTicketCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segment = () => Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${segment()}-${segment()}-${segment()}`;
  };

  const handleAddTicket = async () => {
    try {
      const code = generateTicketCode();
      await setDoc(doc(db, 'tickets', code), {
        code,
        status: 'UNUSED',
        name: ticketForm.name,
        type: ticketForm.type,
        className: ticketForm.className
      });
      setIsAddingTicket(false);
    } catch (error) {
      console.error("Error adding ticket:", error);
    }
  };

  const handleDeleteTicket = async (code: string) => {
    try {
      await deleteDoc(doc(db, 'tickets', code));
      setTicketToDelete(null);
      setSelectedTickets(prev => prev.filter(c => c !== code));
    } catch (error) {
      console.error("Error deleting ticket:", error);
      setAlertMessage("Lỗi khi xóa vé. Vui lòng thử lại.");
    }
  };

  const handleDeleteSelectedTickets = async () => {
    if (selectedTickets.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      selectedTickets.forEach(code => {
        batch.delete(doc(db, 'tickets', code));
      });
      await batch.commit();
      setSelectedTickets([]);
      setIsDeletingSelected(false);
      setAlertMessage(`Đã xóa thành công ${selectedTickets.length} vé.`);
    } catch (error) {
      console.error("Error deleting selected tickets:", error);
      setAlertMessage("Lỗi khi xóa vé. Vui lòng thử lại.");
    }
  };

  const handleEditTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket) return;
    try {
      await updateDoc(doc(db, 'tickets', editingTicket.code), {
        name: ticketForm.name,
        type: ticketForm.type,
        className: ticketForm.className
      });
      setEditingTicket(null);
      setAlertMessage("Cập nhật vé thành công.");
    } catch (error) {
      console.error("Error updating ticket:", error);
      setAlertMessage("Lỗi khi cập nhật vé. Vui lòng thử lại.");
    }
  };

  const handleUploadExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const batch = writeBatch(db);
        let count = 0;
        
        data.forEach((row: any) => {
          const name = row['Họ tên'] || row['Name'] || '';
          const type = row['Phụ huynh/Học sinh'] || row['Type'] || 'Học sinh';
          const className = row['Lớp'] || row['Class'] || '';
          
          if (name) {
            const code = generateTicketCode();
            const ticketRef = doc(db, 'tickets', code);
            batch.set(ticketRef, {
              code,
              status: 'UNUSED',
              name,
              type,
              className
            });
            count++;
          }
        });
        
        if (count > 0) {
          await batch.commit();
          setAlertMessage(`Đã nhập thành công ${count} vé.`);
        }
      } catch (error) {
        console.error("Error parsing Excel:", error);
        setAlertMessage("Lỗi khi đọc file Excel. Vui lòng đảm bảo có các cột: 'Họ tên', 'Phụ huynh/Học sinh', 'Lớp'.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleDownloadExcel = () => {
    const exportData = tickets.map(t => ({
      'Mã Code': t.code,
      'Trạng thái': t.status,
      'Họ tên': t.name,
      'Phụ huynh/Học sinh': t.type,
      'Lớp': t.className
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tickets");
    XLSX.writeFile(wb, "Aurelia_Tickets.xlsx");
  };

  const seedCandidates = async () => {
    try {
      const batch = writeBatch(db);
      [...KINGS, ...QUEENS].forEach(c => {
        const ref = doc(db, 'candidates', c.id);
        batch.set(ref, {
          name: c.name,
          title: c.title,
          role: c.role,
          imageUrl: c.imageUrl,
          votes: c.votes
        });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error seeding candidates:", error);
    }
  };

  const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
  const activeTickets = tickets.filter(t => t.status === 'UNUSED').length;
  const totalTickets = tickets.length;

  const kings = candidates.filter(c => c.role === 'KING');
  const queens = candidates.filter(c => c.role === 'QUEEN');

  const uniqueTypes = Array.from(new Set(tickets.map(t => t.type))).filter(Boolean);

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.className.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const toggleSelectAllTickets = () => {
    if (selectedTickets.length === filteredTickets.length) {
      setSelectedTickets([]);
    } else {
      setSelectedTickets(filteredTickets.map(t => t.code));
    }
  };

  const toggleSelectTicket = (code: string) => {
    setSelectedTickets(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-20 hover:w-64 border-r border-primary/10 bg-slate-950/80 backdrop-blur-xl flex flex-col z-50 transition-all duration-300 group overflow-hidden">
        <div className="p-6 group-hover:p-8 transition-all duration-300">
          <h1 className="font-headline text-2xl font-bold tracking-tighter text-primary drop-shadow-[0_0_10px_rgba(245,206,83,0.3)] whitespace-nowrap">
            <span className="group-hover:hidden">CA</span>
            <span className="hidden group-hover:inline">Celestial Admin</span>
          </h1>
          <p className="text-[8px] uppercase tracking-widest text-on-surface-variant mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Quản lý Prom</p>
        </div>

        <nav className="flex-1 px-3 group-hover:px-4 space-y-2 mt-8 transition-all duration-300">
          <button 
            onClick={() => setActiveTab('CANDIDATES')}
            className={`w-full flex items-center gap-4 px-4 py-3 font-bold transition-all whitespace-nowrap border-l-2 ${activeTab === 'CANDIDATES' ? 'text-primary border-primary bg-gradient-to-r from-primary/5 to-transparent' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border-transparent'}`}
          >
            <Users className="w-5 h-5 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">Quản lý Ứng Viên</span>
          </button>
          <button 
            onClick={() => setActiveTab('TICKETS')}
            className={`w-full flex items-center gap-4 px-4 py-3 font-bold transition-all whitespace-nowrap border-l-2 ${activeTab === 'TICKETS' ? 'text-primary border-primary bg-gradient-to-r from-primary/5 to-transparent' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border-transparent'}`}
          >
            <Ticket className="w-5 h-5 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">Quản lý Vé</span>
          </button>
          <button 
            onClick={() => (window as any).onViewChange('LED_LEADERBOARD')}
            className="w-full flex items-center gap-4 px-4 py-3 text-secondary font-bold hover:bg-secondary/5 transition-all border-l-2 border-transparent hover:border-secondary whitespace-nowrap"
          >
            <Sparkles className="w-5 h-5 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">Chế độ màn hình LED</span>
          </button>
          <button 
            onClick={() => {
              clearSession();
              (window as any).onViewChange('GATEWAY');
            }}
            className="w-full flex items-center gap-4 px-4 py-3 text-red-400 font-bold hover:bg-red-400/5 transition-all border-l-2 border-transparent hover:border-red-400 whitespace-nowrap"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">Đăng xuất Admin</span>
          </button>
        </nav>

        <div className="p-6 space-y-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {/* Blind Mode Toggle */}
          <div className="bg-surface-variant/40 rounded-xl p-4 border border-secondary/20">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] uppercase tracking-widest text-secondary font-bold">Chế độ ẩn</span>
              <button 
                onClick={toggleBlindMode} 
                className={`w-10 h-5 rounded-full relative transition-colors ${isBlindMode ? 'bg-secondary' : 'bg-surface-container-highest'}`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isBlindMode ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
            <p className="text-[8px] text-on-surface-variant leading-tight">Đóng băng bảng xếp hạng công khai.</p>
          </div>

          {/* Poll Operations */}
          <div className="bg-surface-variant/40 rounded-xl p-4 border border-primary/20">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] uppercase tracking-widest text-primary font-bold">Bình Chọn</span>
            </div>
            
            {pollEndTime && pollEndTime > Date.now() ? (
              <div className="flex flex-col gap-2">
                <div className="text-xl font-mono text-center text-primary font-bold">{countdownString || '00:00'}</div>
                <button 
                  onClick={stopPoll} 
                  className="w-full py-1.5 bg-error text-white font-bold text-[10px] uppercase tracking-widest rounded transition-colors hover:brightness-110"
                >
                  Dừng Bình Chọn
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={pollDurationMinutes}
                    onChange={e => setPollDurationMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 bg-surface-container border border-outline-variant/30 rounded p-1 text-xs text-on-surface focus:outline-none"
                    min="1"
                  />
                  <span className="text-[10px] text-on-surface-variant">Phút</span>
                </div>
                <button 
                  onClick={startPoll} 
                  className="w-full py-1.5 bg-primary text-on-primary font-bold text-[10px] uppercase tracking-widest rounded transition-colors hover:brightness-110"
                >
                  Bắt Đầu Bình Chọn
                </button>
              </div>
            )}
            <p className="text-[8px] text-on-surface-variant leading-tight mt-2 pb-1 border-b border-primary/10">Thiết lập thời gian đếm ngược cho người dùng bình chọn.</p>
          </div>

          {/* Danger Zone */}
          <div className="bg-surface-variant/40 rounded-xl p-4 border border-error/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] uppercase tracking-widest text-error font-bold text-center w-full">Khu Vực Nguy Hiểm</span>
            </div>
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setShowResetConfirm(true)} 
                className="w-full py-2 bg-error/20 text-error font-bold text-[10px] uppercase tracking-widest rounded border border-error/50 hover:bg-error hover:text-white transition-colors"
              >
                Đặt Lại Tất Cả Dữ Liệu
              </button>
            </div>
            <p className="text-[8px] text-error/80 leading-tight mt-2 text-center">Đưa tất cả vé về chưa sử dụng và xóa số lượt bình chọn.</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-20 flex-1 p-12 nebula-glow transition-all duration-300">
        {activeTab === 'CANDIDATES' && (
          <div className="space-y-12">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="font-headline text-3xl text-on-surface">Các Ứng Viên</h3>
                <p className="text-xs uppercase tracking-widest text-primary mt-1">Ứng Viên King & Queen</p>
              </div>
              <div className="flex gap-4">
                {candidates.length === 0 && (
                  <button onClick={seedCandidates} className="flex items-center gap-2 text-[10px] font-bold text-secondary hover:text-primary transition-colors uppercase tracking-widest">
                    <Database className="w-4 h-4" /> Tạo Dữ Liệu Mẫu
                  </button>
                )}
                <button 
                  onClick={handleAddClick}
                  className="flex items-center gap-2 text-[10px] font-bold text-primary hover:text-secondary transition-colors uppercase tracking-widest"
                >
                  <PlusCircle className="w-4 h-4" /> Thêm Ứng Viên
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Kings Section */}
              <section>
                <h4 className="font-headline text-2xl text-secondary mb-6 border-b border-secondary/20 pb-2">Ứng viên King</h4>
                <div className="space-y-4">
                  {kings.map((c, i) => (
                    <div key={c.id} className="group relative flex items-center gap-4 bg-surface-container/30 hover:bg-surface-container/50 transition-all p-4 rounded-xl border border-outline-variant/10">
                      <img src={c.imageUrl || undefined} alt={c.name} className="w-16 h-16 rounded-lg object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                      <div className="flex-1">
                        <h5 className="font-headline text-xl text-tertiary">{c.name}</h5>
                        <p className="text-[10px] text-primary italic">{c.title}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="font-headline text-lg text-secondary">{c.votes.toLocaleString()}</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleEditClick(c)}
                            className="text-[10px] px-3 py-1 border border-outline-variant/20 rounded-full hover:border-primary hover:text-primary transition-all uppercase font-bold"
                          >
                            Sửa
                          </button>
                          <button 
                            onClick={() => handleDeleteCandidate(c.id)}
                            className="text-[10px] px-2 py-1 border border-error/20 rounded-full hover:border-error hover:text-error transition-all uppercase font-bold"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {kings.length === 0 && <p className="text-sm text-on-surface-variant italic">Không tìm thấy ứng viên King.</p>}
                </div>
              </section>

              {/* Queens Section */}
              <section>
                <h4 className="font-headline text-2xl text-secondary mb-6 border-b border-secondary/20 pb-2">Ứng viên Queen</h4>
                <div className="space-y-4">
                  {queens.map((c, i) => (
                    <div key={c.id} className="group relative flex items-center gap-4 bg-surface-container/30 hover:bg-surface-container/50 transition-all p-4 rounded-xl border border-outline-variant/10">
                      <img src={c.imageUrl || undefined} alt={c.name} className="w-16 h-16 rounded-lg object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                      <div className="flex-1">
                        <h5 className="font-headline text-xl text-tertiary">{c.name}</h5>
                        <p className="text-[10px] text-primary italic">{c.title}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="font-headline text-lg text-secondary">{c.votes.toLocaleString()}</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleEditClick(c)}
                            className="text-[10px] px-3 py-1 border border-outline-variant/20 rounded-full hover:border-primary hover:text-primary transition-all uppercase font-bold"
                          >
                            Sửa
                          </button>
                          <button 
                            onClick={() => handleDeleteCandidate(c.id)}
                            className="text-[10px] px-2 py-1 border border-error/20 rounded-full hover:border-error hover:text-error transition-all uppercase font-bold"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {queens.length === 0 && <p className="text-sm text-on-surface-variant italic">Không tìm thấy ứng viên Queen.</p>}
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'TICKETS' && (
          <div className="space-y-12">
            {/* Ticket Registry */}
            <section>
              <div className="bg-surface-container-low/60 backdrop-blur-md rounded-2xl p-8 border border-white/5 h-full">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-headline text-2xl text-on-surface">Danh Sách Vé</h3>
                  <div className="flex gap-4">
                    {selectedTickets.length > 0 && (
                      <button 
                        onClick={() => setIsDeletingSelected(true)}
                        className="flex items-center gap-2 text-[10px] font-bold text-error hover:text-error/80 transition-colors uppercase tracking-widest"
                      >
                        <Trash2 className="w-4 h-4" /> Xóa Đã Chọn ({selectedTickets.length})
                      </button>
                    )}
                    <label className="cursor-pointer flex items-center gap-2 text-[10px] font-bold text-secondary hover:text-primary transition-colors uppercase tracking-widest">
                      <Database className="w-4 h-4" /> Tải lên Excel
                      <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleUploadExcel} />
                    </label>
                    <button 
                      onClick={handleDownloadExcel}
                      className="flex items-center gap-2 text-[10px] font-bold text-secondary hover:text-primary transition-colors uppercase tracking-widest"
                    >
                      <Filter className="w-4 h-4" /> Tải xuống Excel
                    </button>
                    <button 
                      onClick={() => {
                        setTicketForm({ name: '', type: 'Học sinh', className: '' });
                        setIsAddingTicket(true);
                      }}
                      className="flex items-center gap-2 text-[10px] font-bold text-primary hover:text-secondary transition-colors uppercase tracking-widest"
                    >
                      <PlusCircle className="w-4 h-4" /> Thêm Vé
                    </button>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input 
                      type="text" 
                      placeholder="Tìm kiếm theo mã, tên, hoặc lớp..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/30 rounded-lg py-2 pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="flex gap-4">
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="bg-surface-container border border-outline-variant/30 rounded-lg py-2 px-4 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                    >
                      <option value="ALL">Tất cả trạng thái</option>
                      <option value="UNUSED">Chưa sử dụng</option>
                      <option value="USED">Đã sử dụng</option>
                    </select>
                    <select 
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="bg-surface-container border border-outline-variant/30 rounded-lg py-2 px-4 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                    >
                      <option value="ALL">Tất cả loại</option>
                      {uniqueTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant border-b border-white/10">
                      <tr>
                        <th className="pb-4 font-bold px-4 w-10">
                          <input 
                            type="checkbox" 
                            checked={filteredTickets.length > 0 && selectedTickets.length === filteredTickets.length}
                            onChange={toggleSelectAllTickets}
                            className="rounded border-outline-variant/30 bg-surface-container text-primary focus:ring-primary focus:ring-offset-background"
                          />
                        </th>
                        <th className="pb-4 font-bold px-4">Mã</th>
                        <th className="pb-4 font-bold px-4">Trạng thái</th>
                        <th className="pb-4 font-bold px-4">Họ tên</th>
                        <th className="pb-4 font-bold px-4">Phụ huynh/Học sinh</th>
                        <th className="pb-4 font-bold px-4">Lớp</th>
                        <th className="pb-4 font-bold px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredTickets.map((t) => (
                        <tr key={t.code} className={`hover:bg-white/5 transition-colors ${selectedTickets.includes(t.code) ? 'bg-primary/5' : ''}`}>
                          <td className="py-4 px-4">
                            <input 
                              type="checkbox" 
                              checked={selectedTickets.includes(t.code)}
                              onChange={() => toggleSelectTicket(t.code)}
                              className="rounded border-outline-variant/30 bg-surface-container text-primary focus:ring-primary focus:ring-offset-background"
                            />
                          </td>
                          <td className="py-4 px-4 font-mono text-secondary">{t.code}</td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.status === 'USED' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-xs text-on-surface-variant">{t.name}</td>
                          <td className="py-4 px-4 text-xs text-on-surface-variant">{t.type}</td>
                          <td className="py-4 px-4 text-xs text-on-surface-variant">{t.className}</td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => {
                                  setEditingTicket(t);
                                  setTicketForm({ name: t.name, type: t.type, className: t.className });
                                }}
                                className="text-[10px] px-2 py-1 border border-outline-variant/20 rounded-full hover:border-primary hover:text-primary transition-all uppercase font-bold"
                              >
                                Sửa
                              </button>
                              <button 
                                onClick={() => setTicketToDelete(t.code)}
                                className="text-[10px] px-2 py-1 border border-error/20 rounded-full hover:border-error hover:text-error transition-all uppercase font-bold"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredTickets.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-on-surface-variant text-sm">Không tìm thấy vé nào.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Add Ticket Modal */}
      {isAddingTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-high border border-outline-variant/30 rounded-2xl p-8 w-full max-w-md shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-2xl text-on-surface">Thêm Vé</h3>
              <button 
                onClick={() => setIsAddingTicket(false)} 
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Họ tên</label>
                <input 
                  type="text" 
                  value={ticketForm.name}
                  onChange={(e) => setTicketForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                />
              </div>
              
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Phụ huynh/Học sinh</label>
                <select
                  value={ticketForm.type}
                  onChange={(e) => setTicketForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                >
                  <option value="Học sinh">Học sinh</option>
                  <option value="Phụ huynh">Phụ huynh</option>
                  <option value="Khách mời">Khách mời</option>
                </select>
              </div>
              
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Lớp</label>
                <input 
                  type="text" 
                  value={ticketForm.className}
                  onChange={(e) => setTicketForm(prev => ({ ...prev, className: e.target.value }))}
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setIsAddingTicket(false)} 
                  className="flex-1 py-3 border border-outline-variant/30 text-on-surface-variant font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddTicket} 
                  disabled={!ticketForm.name}
                  className="flex-1 py-3 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest rounded-lg hover:brightness-110 transition-all shadow-[0_0_15px_rgba(245,206,83,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Ticket
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit/Add Profile Modal */}
      {(editingCandidate || isAddingCandidate) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-high border border-outline-variant/30 rounded-2xl p-8 w-full max-w-md shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-2xl text-on-surface">
                {isAddingCandidate ? 'Add Candidate' : 'Edit Profile'}
              </h3>
              <button 
                onClick={() => {
                  setEditingCandidate(null);
                  setIsAddingCandidate(false);
                }} 
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {editForm.imageUrl && (
                <div className="flex justify-center mb-6">
                  <img 
                    src={editForm.imageUrl || undefined} 
                    alt="Preview" 
                    className="w-24 h-24 rounded-full object-cover border-2 border-primary/30"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value as 'KING' | 'QUEEN' }))}
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                >
                  <option value="KING">King</option>
                  <option value="QUEEN">Queen</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Candidate Name</label>
                <input 
                  type="text" 
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                />
              </div>
              
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Title / Accolades</label>
                <input 
                  type="text" 
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                />
              </div>
              
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Image URL</label>
                <input 
                  type="text" 
                  value={editForm.imageUrl}
                  onChange={(e) => setEditForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => {
                    setEditingCandidate(null);
                    setIsAddingCandidate(false);
                  }} 
                  className="flex-1 py-3 border border-outline-variant/30 text-on-surface-variant font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveCandidate} 
                  className="flex-1 py-3 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest rounded-lg hover:brightness-110 transition-all shadow-[0_0_15px_rgba(245,206,83,0.2)]"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {/* Edit Ticket Modal */}
      {editingTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-high border border-outline-variant/30 rounded-2xl p-8 w-full max-w-md shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-2xl text-on-surface">Edit Ticket</h3>
              <button onClick={() => setEditingTicket(null)} className="text-on-surface-variant hover:text-on-surface">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleEditTicketSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Họ tên</label>
                <input 
                  type="text" 
                  value={ticketForm.name}
                  onChange={e => setTicketForm({...ticketForm, name: e.target.value})}
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Phụ huynh/Học sinh</label>
                <input 
                  type="text" 
                  value={ticketForm.type}
                  onChange={e => setTicketForm({...ticketForm, type: e.target.value})}
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Lớp</label>
                <input 
                  type="text" 
                  value={ticketForm.className}
                  onChange={e => setTicketForm({...ticketForm, className: e.target.value})}
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-primary text-on-primary font-bold text-sm uppercase tracking-widest rounded-lg hover:brightness-110 transition-all shadow-[0_0_20px_rgba(245,206,83,0.3)] mt-4"
              >
                Save Changes
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {ticketToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-high border border-outline-variant/30 rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center"
          >
            <AlertTriangle className="w-12 h-12 text-error mx-auto mb-4" />
            <h3 className="font-headline text-xl text-on-surface mb-2">Delete Ticket</h3>
            <p className="text-sm text-on-surface-variant mb-6">Are you sure you want to delete ticket <span className="font-mono text-secondary">{ticketToDelete}</span>? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setTicketToDelete(null)} 
                className="flex-1 py-3 border border-outline-variant/30 text-on-surface-variant font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteTicket(ticketToDelete)} 
                className="flex-1 py-3 bg-error text-white font-bold text-xs uppercase tracking-widest rounded-lg hover:brightness-110 transition-all shadow-[0_0_15px_rgba(245,83,83,0.2)]"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isDeletingSelected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-high border border-outline-variant/30 rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center"
          >
            <AlertTriangle className="w-12 h-12 text-error mx-auto mb-4" />
            <h3 className="font-headline text-xl text-on-surface mb-2">Delete Multiple Tickets</h3>
            <p className="text-sm text-on-surface-variant mb-6">Are you sure you want to delete <span className="font-bold text-secondary">{selectedTickets.length}</span> selected tickets? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeletingSelected(false)} 
                className="flex-1 py-3 border border-outline-variant/30 text-on-surface-variant font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteSelectedTickets} 
                className="flex-1 py-3 bg-error text-white font-bold text-xs uppercase tracking-widest rounded-lg hover:brightness-110 transition-all shadow-[0_0_15px_rgba(245,83,83,0.2)]"
              >
                Delete All
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-high border-2 border-error/50 rounded-2xl p-8 w-full max-w-md shadow-[0_0_50px_rgba(245,83,83,0.15)]"
          >
            <h3 className="font-headline text-2xl text-error mb-2 text-center">WARNING</h3>
            <p className="text-sm text-on-surface-variant mb-6 text-center leading-relaxed">
              Are you SURE you want to reset all tickets to UNUSED and clear all candidate votes? <br/><br/>
              <strong>This action cannot be undone.</strong>
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowResetConfirm(false)} 
                className="flex-1 py-3 bg-surface-variant text-on-surface-variant font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-surface-variant/80 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleResetAll} 
                className="flex-1 py-3 bg-error text-white font-bold text-xs uppercase tracking-widest rounded-lg hover:brightness-110 transition-all shadow-[0_0_15px_rgba(245,83,83,0.2)]"
              >
                Reset All Data
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-high border border-outline-variant/30 rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center"
          >
            <h3 className="font-headline text-xl text-on-surface mb-4">Notification</h3>
            <p className="text-sm text-on-surface-variant mb-6">{alertMessage}</p>
            <button 
              onClick={() => setAlertMessage(null)} 
              className="w-full py-3 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest rounded-lg hover:brightness-110 transition-all shadow-[0_0_15px_rgba(245,206,83,0.2)]"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
