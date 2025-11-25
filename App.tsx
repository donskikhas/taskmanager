
import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Task, Project, TableCollection, Doc, Folder, Meeting, ActivityLog, 
  Role, StatusOption, PriorityOption, ViewMode, Attachment, Comment 
} from './types';
import { storageService } from './services/storageService';
import { sendTelegramNotification, formatStatusChangeMessage, formatNewTaskMessage } from './services/telegramService';
import Sidebar from './components/Sidebar';
import TableView from './components/TableView';
import KanbanBoard from './components/KanbanBoard';
import GanttView from './components/GanttView';
import TaskModal from './components/TaskModal';
import SettingsModal from './components/SettingsModal';
import InboxView from './components/InboxView';
import HomeView from './components/HomeView';
import MeetingsView from './components/MeetingsView';
import DocModal from './components/DocModal';
import DocEditor from './components/DocEditor';
import ProfileModal from './components/ProfileModal';
import FilterBar from './components/FilterBar';
import BacklogView from './components/BacklogView';
import DocsView from './components/DocsView';
import { LogoIcon, FAVICON_SVG_DATA_URI } from './components/AppIcons';
import { 
  Bug, CheckSquare, Target, FileText, Users, Briefcase, Zap, Star, Heart, Flag, Rocket, Layout, 
  Search, Inbox, Home, Settings, LogOut, ChevronRight, 
  LayoutList, KanbanSquare as KanbanIcon, Calendar, Plus, Bell, Loader2, Moon, Sun 
} from 'lucide-react';
import { MOCK_USERS, MOCK_TABLES, ICON_OPTIONS, COLOR_OPTIONS, getColorStyles } from './constants';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // SYNC INITIALIZATION OF THEME
  const [isDarkMode, setIsDarkMode] = useState(() => {
      return localStorage.getItem('cfo_theme') === 'dark';
  });

  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tables, setTables] = useState<TableCollection[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [statuses, setStatuses] = useState<StatusOption[]>([]);
  const [priorities, setPriorities] = useState<PriorityOption[]>([]);

  // Navigation State
  const [currentView, setCurrentView] = useState<'home' | 'inbox' | 'search' | 'table' | 'doc-editor'>('home');
  const [activeTableId, setActiveTableId] = useState<string>('');
  const [activeDocId, setActiveDocId] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.TABLE);

  // UI State
  const [notification, setNotification] = useState<string | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  
  // Folder Creation Modal State
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [newDocFolderId, setNewDocFolderId] = useState<string | null>(null);

  // Create/Edit Table State
  const [isCreateTableModalOpen, setIsCreateTableModalOpen] = useState(false);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [newTableName, setNewTableName] = useState('');
  const [newTableType, setNewTableType] = useState<'tasks' | 'docs' | 'meetings' | 'backlog'>('tasks');
  const [newTableIcon, setNewTableIcon] = useState('CheckSquare');
  const [newTableColor, setNewTableColor] = useState('text-gray-500');
  const [newTableViewConfig, setNewTableViewConfig] = useState({ showTable: true, showKanban: true, showGantt: true });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [hideDone, setHideDone] = useState(false);

  // Auth State
  const [loginForm, setLoginForm] = useState({ login: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [changePasswordMode, setChangePasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // --- Initialization ---
  useEffect(() => {
    const faviconLink = document.getElementById('dynamic-favicon') as HTMLLinkElement;
    if (faviconLink) faviconLink.href = FAVICON_SVG_DATA_URI;

    const init = async () => {
      setLoading(true);
      await storageService.loadFromCloud();
      setUsers(storageService.getUsers());
      setTasks(storageService.getTasks());
      setProjects(storageService.getProjects());
      
      // Deduplication
      let loadedTables = storageService.getTables();
      let uniqueTables = loadedTables.filter((v,i,a)=>a.findIndex(t=>(t.id===v.id))===i);
      const backlogTables = uniqueTables.filter(t => t.type === 'backlog');
      if (backlogTables.length > 1) {
          const keep = backlogTables.find(t => t.isSystem) || backlogTables[0];
          uniqueTables = uniqueTables.filter(t => t.type !== 'backlog' || t.id === keep.id);
      } else if (backlogTables.length === 0) {
          const backlogMock = MOCK_TABLES.find(t => t.type === 'backlog');
          if (backlogMock) uniqueTables.push(backlogMock);
      }
      setTables(uniqueTables);

      setDocs(storageService.getDocs());
      setFolders(storageService.getFolders());
      setMeetings(storageService.getMeetings());
      setActivities(storageService.getActivities());
      setStatuses(storageService.getStatuses());
      setPriorities(storageService.getPriorities());

      const sessionUid = localStorage.getItem('cfo_session_uid');
      if (sessionUid) {
          const user = storageService.getUsers().find(u => u.id === sessionUid);
          if (user) setCurrentUser(user);
      }
      
      // Apply theme immediately
      if (isDarkMode) {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }

      setLoading(false);
    };
    init();
  }, []); 

  useEffect(() => {
      if (isDarkMode) {
          document.documentElement.classList.add('dark');
          localStorage.setItem('cfo_theme', 'dark');
      } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('cfo_theme', 'light');
      }
  }, [isDarkMode]);

  useEffect(() => {
      if (!loading && tables.length > 0 && !activeTableId) {
          const first = tables.find(t => t.type === 'tasks') || tables[0];
          if (first) setActiveTableId(first.id);
      }
  }, [tables, loading, activeTableId]);

  useEffect(() => {
      const table = tables.find(t => t.id === activeTableId);
      if (table) {
          if (table.type === 'tasks') {
              setHideDone(true); 
              const config = table.viewConfig || { showTable: true, showKanban: true, showGantt: true };
              if (viewMode === ViewMode.TABLE && !config.showTable) {
                  if (config.showKanban) setViewMode(ViewMode.KANBAN);
                  else if (config.showGantt) setViewMode(ViewMode.GANTT);
              }
          } else {
              setHideDone(false);
          }
      }
  }, [activeTableId, tables]);

  const activeTable = tables.find(t => t.id === activeTableId);
  const activeDoc = docs.find(d => d.id === activeDocId);

  const showNotification = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };

  // --- Auth ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => (u.login?.toLowerCase() === loginForm.login.toLowerCase()) && u.password === loginForm.password);
    if (user) {
        if (user.mustChangePassword) { setChangePasswordMode(true); return; }
        setCurrentUser(user);
        localStorage.setItem('cfo_session_uid', user.id);
        setAuthError('');
    } else {
        setAuthError('Неверный логин или пароль');
    }
  };

  const handleFirstTimePasswordChange = (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) return setAuthError('Пароли не совпадают');
      const tempUser = users.find(u => u.login?.toLowerCase() === loginForm.login.toLowerCase());
      if (tempUser) {
          const updatedUser = { ...tempUser, password: newPassword, mustChangePassword: false };
          const uList = users.map(u => u.id === tempUser.id ? updatedUser : u);
          setUsers(uList); storageService.setUsers(uList); setCurrentUser(updatedUser); localStorage.setItem('cfo_session_uid', updatedUser.id); setChangePasswordMode(false);
      }
  };

  const handleLogout = () => { setCurrentUser(null); localStorage.removeItem('cfo_session_uid'); setChangePasswordMode(false); };

  // --- Handlers ---
  const logActivity = (action: string, details: string) => {
    if (!currentUser) return;
    const log: ActivityLog = { id: `act-${Date.now()}`, userId: currentUser.id, userName: currentUser.name, userAvatar: currentUser.avatar || '', action, details, timestamp: new Date().toISOString(), read: false };
    setActivities(storageService.addActivity(log));
  };

  const handleNavigate = (view: 'home' | 'inbox' | 'search') => { setCurrentView(view); setActiveTableId(''); };
  const handleSelectTable = (id: string) => { setActiveTableId(id); setCurrentView('table'); };

  const handleUpdateUsers = (u: User[]) => { setUsers(u); storageService.setUsers(u); };
  const handleUpdateProjects = (p: Project[]) => { setProjects(p); storageService.setProjects(p); };
  const handleUpdateStatuses = (s: StatusOption[]) => { setStatuses(s); storageService.setStatuses(s); };
  const handleUpdatePriorities = (p: PriorityOption[]) => { setPriorities(p); storageService.setPriorities(p); };

  // --- Tasks ---
  const handleCreateTask = (taskData: Partial<Task>) => {
    const newTask: Task = {
        id: `task-${Date.now()}`, tableId: activeTableId,
        title: taskData.title || 'Новая задача', status: taskData.status || statuses[0]?.name || 'Не начато',
        priority: taskData.priority || priorities[0]?.name || 'Низкий', assigneeId: taskData.assigneeId || null,
        projectId: taskData.projectId || null, startDate: taskData.startDate || new Date().toISOString().split('T')[0],
        endDate: taskData.endDate || new Date().toISOString().split('T')[0], description: taskData.description || '',
        isArchived: false, comments: [], attachments: []
    };
    const u = [...tasks, newTask]; setTasks(u); storageService.setTasks(u);
    logActivity('создал задачу', newTask.title);
    setIsTaskModalOpen(false); showNotification('Задача создана');
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    // Update Global State
    setTasks(prevTasks => {
        const updatedTasks = prevTasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
        storageService.setTasks(updatedTasks);
        return updatedTasks;
    });

    // FIX: Update Local Editing Task State if it's open
    if (editingTask && editingTask.id === taskId) {
        setEditingTask(prev => prev ? { ...prev, ...updates } : null);
    }

    const oldTask = tasks.find(t => t.id === taskId);
    if (oldTask && updates.status && updates.status !== oldTask.status) {
        logActivity('обновил статус', `${oldTask.title}: ${oldTask.status} -> ${updates.status}`);
        sendTelegramNotification(formatStatusChangeMessage(oldTask.title, oldTask.status, updates.status!, currentUser?.name || 'User'));
    }
    if (updates.isArchived) { showNotification('Задача в архиве'); setIsTaskModalOpen(false); }
  };

  const handleDeleteTask = (id: string) => handleUpdateTask(id, { isArchived: true });
  const handlePermanentDelete = (id: string) => { const u = tasks.filter(t => t.id !== id); setTasks(u); storageService.setTasks(u); };
  const handleRestoreTask = (id: string) => { handleUpdateTask(id, { isArchived: false }); showNotification('Восстановлено'); };
  
  const handleAddComment = (taskId: string, text: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (task && currentUser) {
          const c: Comment = { id: `c-${Date.now()}`, userId: currentUser.id, userName: currentUser.name, userAvatar: currentUser.avatar || '', text, createdAt: new Date().toISOString() };
          handleUpdateTask(taskId, { comments: [...(task.comments || []), c] });
      }
  };
  
  const handleAddAttachment = (taskId: string, att: Attachment) => {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
          handleUpdateTask(taskId, { attachments: [...(task.attachments || []), att] });
          // SYNC DOCS
          if (att.type === 'link' && att.url) {
              const docsTable = tables.find(t => t.type === 'docs');
              if (docsTable) {
                  const newDoc: Doc = { id: `doc-${Date.now()}`, tableId: docsTable.id, title: att.name, type: 'link', url: att.url, tags: ['Из задач'], content: '' };
                  const updatedDocs = [...docs, newDoc]; setDocs(updatedDocs); storageService.setDocs(updatedDocs);
              }
          }
      }
  };

  const handleDeleteAttachment = (taskId: string, attachmentId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.attachments) {
          const updatedAttachments = task.attachments.filter(a => a.id !== attachmentId);
          handleUpdateTask(taskId, { attachments: updatedAttachments });
      }
  };

  // --- Docs & Folders ---
  const handleCreateFolderSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newFolderName.trim()) return;
      setFolders(prev => {
          const updated = [...prev, { id: `f-${Date.now()}`, name: newFolderName, tableId: activeTableId }];
          storageService.setFolders(updated);
          return updated;
      });
      setIsFolderModalOpen(false); setNewFolderName(''); showNotification('Папка создана');
  };

  const handleDeleteFolder = (id: string) => {
      if (confirm('Удалить папку?')) {
          setFolders(prev => {
              const updated = prev.filter(f => f.id !== id);
              storageService.setFolders(updated);
              return updated;
          });
      }
  };

  const handleCreateDoc = (data: any) => {
      const d: Doc = { id: `d-${Date.now()}`, tableId: activeTableId, ...data };
      const u = [...docs, d]; setDocs(u); storageService.setDocs(u);
      setIsDocModalOpen(false); showNotification('Документ создан');
      if (data.type === 'internal') { setActiveDocId(d.id); setCurrentView('doc-editor'); }
  };
  const handleSaveDocContent = (id: string, content: string, title: string) => {
      const u = docs.map(d => d.id === id ? { ...d, content, title } : d); setDocs(u); storageService.setDocs(u); showNotification('Сохранено');
  };
  const handleDeleteDoc = (id: string) => { if (confirm('Удалить?')) { const u = docs.filter(d => d.id !== id); setDocs(u); storageService.setDocs(u); } };

  // --- Meetings ---
  const handleSaveMeeting = (m: Meeting) => { const u = [...meetings, m]; setMeetings(u); storageService.setMeetings(u); showNotification('Встреча создана'); };
  const handleUpdateSummary = (id: string, s: string) => { const u = meetings.map(m => m.id === id ? { ...m, summary: s } : m); setMeetings(u); storageService.setMeetings(u); };

  // --- Pages ---
  const openCreateTableModal = () => { setEditingTableId(null); setNewTableName(''); setIsCreateTableModalOpen(true); };
  const openEditTableModal = (t: TableCollection) => { setEditingTableId(t.id); setNewTableName(t.name); setNewTableType(t.type); setNewTableIcon(t.icon); setNewTableColor(t.color || 'text-gray-500'); setIsCreateTableModalOpen(true); };
  
  const handleCreateTableSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTableName.trim()) return;
      const newTableData = { 
          name: newTableName, type: newTableType, icon: newTableIcon, color: newTableColor, 
          viewConfig: newTableType === 'tasks' ? newTableViewConfig : undefined 
      };
      let updatedTables;
      if (editingTableId) {
          updatedTables = tables.map(t => t.id === editingTableId ? { ...t, ...newTableData } : t);
      } else {
          const newTable = { id: `t-${Date.now()}`, isSystem: false, ...newTableData } as TableCollection;
          updatedTables = [...tables, newTable];
          setActiveTableId(newTable.id); setCurrentView('table');
      }
      setTables(updatedTables); storageService.setTables(updatedTables); setIsCreateTableModalOpen(false);
  };
  const handleDeleteTable = (id: string) => { if(confirm('Удалить?')) { const u = tables.filter(t => t.id !== id); setTables(u); storageService.setTables(u); if(activeTableId === id) handleNavigate('home'); } };

  // --- Helpers ---
  const getFilteredTasks = () => {
      return tasks.filter(t => {
          if (t.isArchived) return false;
          if (activeTableId && t.tableId !== activeTableId) return false;
          if (hideDone && t.status === 'Выполнено') return false;
          if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
          if (statusFilter && t.status !== statusFilter) return false;
          if (userFilter && t.assigneeId !== userFilter) return false;
          if (projectFilter && t.projectId !== projectFilter) return false;
          return true;
      });
  };

  const getDynamicIcon = (name: string, color = 'text-gray-600', size = 24) => {
      const props = { size, className: color };
      switch(name) {
          case 'Bug': return <Bug {...props} />; case 'CheckSquare': return <CheckSquare {...props} />;
          case 'Target': return <Target {...props} />; case 'FileText': return <FileText {...props} />;
          case 'Users': return <Users {...props} />; case 'Briefcase': return <Briefcase {...props} />;
          case 'Zap': return <Zap {...props} />; case 'Star': return <Star {...props} />;
          case 'Heart': return <Heart {...props} />; case 'Flag': return <Flag {...props} />;
          case 'Rocket': return <Rocket {...props} />; default: return <Layout {...props} />;
      }
  };

  if (loading) return <div className="h-screen flex items-center justify-center dark:bg-notion-dark-bg"><Loader2 className="animate-spin dark:text-white" /></div>;

  if (!currentUser) {
      return (
          <div className="h-screen flex items-center justify-center bg-[#F7F7F5] dark:bg-notion-dark-bg">
              <div className="bg-white dark:bg-notion-dark-sidebar p-8 rounded-xl shadow-lg w-full max-w-sm border border-gray-200 dark:border-notion-dark-border">
                  <div className="flex justify-center mb-6"><LogoIcon className="w-16 h-16" /></div>
                  <h2 className="text-xl font-bold text-center mb-6 dark:text-white">{changePasswordMode ? 'Смена пароля' : 'Вход в CFO Workspace'}</h2>
                  {authError && <div className="mb-4 bg-red-50 text-red-600 p-2 rounded text-sm">{authError}</div>}
                  {changePasswordMode ? (
                      <form onSubmit={handleFirstTimePasswordChange} className="space-y-4">
                          <div><label className="block text-xs font-bold text-gray-500 mb-1">Новый пароль</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-[#2C2C2C] dark:border-gray-600 dark:text-white" /></div>
                          <div><label className="block text-xs font-bold text-gray-500 mb-1">Повторите</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-[#2C2C2C] dark:border-gray-600 dark:text-white" /></div>
                          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded font-bold">Сохранить</button>
                      </form>
                  ) : (
                      <form onSubmit={handleLogin} className="space-y-4">
                          <div><label className="block text-xs font-bold text-gray-500 mb-1">Логин</label><input value={loginForm.login} onChange={e => setLoginForm({...loginForm, login: e.target.value})} className="w-full border rounded p-2 bg-white text-gray-900 dark:bg-[#2C2C2C] dark:border-gray-600 dark:text-white" /></div>
                          <div><label className="block text-xs font-bold text-gray-500 mb-1">Пароль</label><input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full border rounded p-2 bg-white text-gray-900 dark:bg-[#2C2C2C] dark:border-gray-600 dark:text-white" /></div>
                          <button type="submit" className="w-full bg-[#FA7313] text-white p-2 rounded font-bold hover:bg-[#e0650f]">Войти</button>
                      </form>
                  )}
              </div>
          </div>
      );
  }

  if (activeDocId) {
      const doc = docs.find(d => d.id === activeDocId);
      if (doc) return <DocEditor doc={doc} onSave={handleSaveDocContent} onBack={() => setActiveDocId(null)} />;
      else setActiveDocId(null);
  }

  return (
    <div className={`flex h-screen w-full bg-white dark:bg-notion-dark-bg text-notion-text dark:text-notion-dark-text ${isDarkMode ? 'dark' : ''}`}>
       <Sidebar tables={tables} activeTableId={activeTableId} onSelectTable={handleSelectTable} onNavigate={handleNavigate} currentView={currentView} currentUser={currentUser} onCreateTable={openCreateTableModal} onOpenSettings={() => setIsSettingsOpen(true)} onDeleteTable={handleDeleteTable} unreadCount={activities.filter(a => !a.read).length} />

       <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-notion-dark-bg">
          <header className="h-14 border-b border-gray-200 dark:border-notion-dark-border flex items-center justify-between px-6 shrink-0 bg-white dark:bg-notion-dark-bg">
             <div className="flex items-center gap-3 flex-1 max-w-xl">
                 {currentView === 'home' && <h2 className="font-semibold text-lg">Главная</h2>}
                 {currentView === 'inbox' && <h2 className="font-semibold text-lg">Входящие</h2>}
                 {currentView === 'table' && activeTable && (
                     <div className="flex items-center gap-2">
                         <span className={`p-1 rounded bg-gray-100 dark:bg-notion-dark-sidebar ${activeTable.color?.replace('text-', 'text-') || 'text-gray-500'}`}>
                            {/* FIX: Show Dynamic Page Icon here */}
                             {getDynamicIcon(activeTable.icon, 'w-4 h-4 text-current', 16)}
                         </span>
                         <h2 className="font-semibold text-lg truncate">{activeTable.name}</h2>
                         {currentUser.role === Role.ADMIN && <button onClick={() => openEditTableModal(activeTable)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-notion-dark-hover"><Settings size={14}/></button>}
                     </div>
                 )}
                 
                 {/* GLOBAL SEARCH */}
                 <div className="relative flex-1 mx-4 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Поиск..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-100 dark:bg-notion-dark-sidebar border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-500"
                    />
                 </div>
             </div>
             <div className="flex items-center gap-4">
                 <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 p-1 rounded hover:bg-gray-100 dark:hover:bg-notion-dark-hover">
                     {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
                 </button>
                 <button className="relative text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 p-1 rounded hover:bg-gray-100 dark:hover:bg-notion-dark-hover" onClick={() => handleNavigate('inbox')}><Bell size={20} />{activities.filter(a => !a.read).length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>}</button>
                 <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-notion-dark-hover p-1 rounded-lg transition-colors" onClick={() => setIsProfileOpen(true)}><img src={currentUser.avatar} className="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-600" /><span className="text-sm font-medium hidden sm:block">{currentUser.name}</span></div>
                 <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-gray-100 dark:hover:bg-notion-dark-hover"><LogOut size={18} /></button>
             </div>
          </header>

          <div className="flex-1 overflow-hidden flex flex-col relative">
              {currentView === 'home' && <HomeView currentUser={currentUser} tasks={tasks} recentActivity={activities} onOpenTask={(t) => { setEditingTask(t); setIsTaskModalOpen(true); }} onNavigateToInbox={() => handleNavigate('inbox')} />}
              {currentView === 'inbox' && <InboxView activities={activities} onMarkAllRead={() => { const u = activities.map(a => ({ ...a, read: true })); setActivities(u); storageService.setActivities(u); }} />}
              
              {/* TASK VIEW - ABSOLUTE CONTAINER FOR ROBUST SCROLLING */}
              {currentView === 'table' && activeTable?.type === 'tasks' && (
                  <div className="flex flex-col h-full">
                      <div className="px-6 py-3 border-b border-gray-200 dark:border-notion-dark-border flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-notion-dark-bg shrink-0">
                          <div className="flex items-center bg-gray-100 dark:bg-notion-dark-sidebar p-1 rounded-lg shrink-0">
                             {activeTable.viewConfig?.showTable && <button onClick={() => setViewMode(ViewMode.TABLE)} className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${viewMode === ViewMode.TABLE ? 'bg-white dark:bg-notion-dark-bg shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'}`}>Таблица</button>}
                             {activeTable.viewConfig?.showKanban && <button onClick={() => setViewMode(ViewMode.KANBAN)} className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${viewMode === ViewMode.KANBAN ? 'bg-white dark:bg-notion-dark-bg shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'}`}>Канбан</button>}
                             {activeTable.viewConfig?.showGantt && <button onClick={() => setViewMode(ViewMode.GANTT)} className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${viewMode === ViewMode.GANTT ? 'bg-white dark:bg-notion-dark-bg shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'}`}>Гант</button>}
                          </div>
                          <div className="flex items-center gap-3">
                              <FilterBar statuses={statuses} users={users} projects={projects} statusFilter={statusFilter} setStatusFilter={setStatusFilter} userFilter={userFilter} setUserFilter={setUserFilter} projectFilter={projectFilter} setProjectFilter={setProjectFilter} hideDone={hideDone} setHideDone={setHideDone} />
                              <button onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2"><Plus size={16} /> Новая</button>
                          </div>
                      </div>
                      
                      {/* CONTENT AREA - USES ABSOLUTE INSET-0 TO FORCE SCROLL WITHIN */}
                      <div className="flex-1 relative bg-white dark:bg-notion-dark-bg">
                          {viewMode === ViewMode.TABLE && (
                              <div className="absolute inset-0 p-4 overflow-hidden">
                                 <TableView tasks={getFilteredTasks()} users={users} projects={projects} statuses={statuses} priorities={priorities} currentUser={currentUser} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onOpenTask={(t) => { setEditingTask(t); setIsTaskModalOpen(true); }} />
                              </div>
                          )}
                          {viewMode === ViewMode.KANBAN && (
                            <div className="absolute inset-0 overflow-auto p-4">
                                <KanbanBoard tasks={getFilteredTasks()} users={users} projects={projects} statuses={statuses} currentUser={currentUser} onUpdateStatus={(tid, s) => handleUpdateTask(tid, { status: s })} onOpenTask={(t) => { setEditingTask(t); setIsTaskModalOpen(true); }} onAddClick={(s) => { setEditingTask(null); setIsTaskModalOpen(true); }} />
                            </div>
                          )}
                          {viewMode === ViewMode.GANTT && (
                            <div className="absolute inset-0 overflow-auto p-4">
                                <GanttView tasks={getFilteredTasks()} projects={projects} onOpenTask={(t) => { setEditingTask(t); setIsTaskModalOpen(true); }} />
                            </div>
                          )}
                      </div>
                  </div>
              )}

              {currentView === 'table' && activeTable?.type === 'backlog' && (
                  <div className="flex flex-col h-full bg-white dark:bg-notion-dark-bg">
                      <div className="px-6 py-3 border-b border-gray-200 dark:border-notion-dark-border flex justify-end">
                          <button onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2"><Plus size={16} /> Новая задача</button>
                      </div>
                      <div className="flex-1 overflow-y-auto px-6">
                        <BacklogView tasks={getFilteredTasks().filter(t => t.tableId === activeTableId)} projects={projects} priorities={priorities} currentUser={currentUser} onTakeToWork={(t) => handleUpdateTask(t.id, { status: statuses[1]?.name || 'В работе', tableId: tables.find(tb => tb.type === 'tasks')?.id || activeTableId })} onDeleteTask={handleDeleteTask} onOpenTask={(t) => { setEditingTask(t); setIsTaskModalOpen(true); }} />
                      </div>
                  </div>
              )}

              {currentView === 'table' && activeTable?.type === 'meetings' && (
                  <MeetingsView meetings={meetings} users={users} tableId={activeTableId} onSaveMeeting={handleSaveMeeting} onUpdateSummary={handleUpdateSummary} />
              )}

              {currentView === 'table' && activeTable?.type === 'docs' && (
                  <DocsView 
                      docs={docs} 
                      folders={folders} 
                      currentUser={currentUser} 
                      tableId={activeTableId}
                      onOpenDoc={(doc) => { 
                          if (doc.type === 'internal') { setActiveDocId(doc.id); setCurrentView('doc-editor'); } 
                          else if (doc.url) window.open(doc.url, '_blank'); 
                      }}
                      onCreateDoc={(folderId) => { setNewDocFolderId(folderId || null); setIsDocModalOpen(true); }}
                      onDeleteDoc={handleDeleteDoc}
                      onCreateFolder={() => setIsFolderModalOpen(true)}
                      onDeleteFolder={handleDeleteFolder}
                  />
              )}
          </div>
          
          {notification && <div className="fixed bottom-6 right-6 bg-gray-900 dark:bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg z-[99]">{notification}</div>}
       </main>

       {/* Modals */}
       {isTaskModalOpen && <TaskModal users={users} projects={projects} statuses={statuses} priorities={priorities} currentUser={currentUser} docs={docs} task={editingTask} onSave={editingTask ? (u) => handleUpdateTask(editingTask.id, u) : handleCreateTask} onClose={() => setIsTaskModalOpen(false)} onDelete={handleDeleteTask} onCreateProject={(name) => handleUpdateProjects([...projects, {id:`p-${Date.now()}`, name, color:'text-gray-500'}])} onAddComment={handleAddComment} onAddAttachment={handleAddAttachment} onDeleteAttachment={handleDeleteAttachment} />}
       {isSettingsOpen && <SettingsModal users={users} projects={projects} tasks={tasks} statuses={statuses} priorities={priorities} onUpdateUsers={handleUpdateUsers} onUpdateProjects={handleUpdateProjects} onUpdateStatuses={handleUpdateStatuses} onUpdatePriorities={handleUpdatePriorities} onRestoreTask={handleRestoreTask} onPermanentDelete={handlePermanentDelete} onClose={() => setIsSettingsOpen(false)} />}
       {isProfileOpen && <ProfileModal user={currentUser} onSave={(u) => { handleUpdateUsers(users.map(user => user.id === u.id ? u : user)); setCurrentUser(u); localStorage.setItem('cfo_current_user', JSON.stringify(u)); setIsProfileOpen(false); showNotification('Профиль обновлен'); }} onClose={() => setIsProfileOpen(false)} />}
       {isDocModalOpen && <DocModal folders={folders.filter(f => f.tableId === activeTableId)} activeFolderId={newDocFolderId} onSave={handleCreateDoc} onClose={() => setIsDocModalOpen(false)} />}
       
       {/* Folder Modal */}
       {isFolderModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[70]">
              <div className="bg-white dark:bg-notion-dark-sidebar rounded-xl shadow-2xl w-full max-w-sm p-6 border border-gray-200 dark:border-notion-dark-border">
                  <h3 className="font-bold text-gray-800 dark:text-white mb-4">Новая папка</h3>
                  <form onSubmit={handleCreateFolderSubmit}>
                      <input autoFocus required value={newFolderName} onChange={e => setNewFolderName(e.target.value)} className="w-full border rounded p-2 mb-4 bg-white dark:bg-notion-dark-bg" placeholder="Название" />
                      <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setIsFolderModalOpen(false)} className="px-4 py-2 rounded bg-gray-100 dark:bg-gray-700 dark:text-white">Отмена</button>
                          <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Создать</button>
                      </div>
                  </form>
              </div>
          </div>
       )}

       {/* Create Table Modal */}
       {isCreateTableModalOpen && (
         <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60]">
             <div className="bg-white dark:bg-notion-dark-sidebar rounded-xl shadow-2xl p-6 w-full max-w-md border border-gray-200 dark:border-notion-dark-border">
                 <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">{editingTableId ? 'Настройки страницы' : 'Новая страница'}</h2>
                 <form onSubmit={handleCreateTableSubmit} className="space-y-4">
                     <div><label className="block text-xs font-bold text-gray-500 mb-1">Название</label><input value={newTableName} onChange={e => setNewTableName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white dark:bg-notion-dark-bg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Например: Маркетинг" autoFocus /></div>
                     
                     {!editingTableId && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">Тип страницы</label>
                            <div className="grid grid-cols-4 gap-2">
                                {[{id:'tasks',icon:<CheckSquare size={16}/>,l:'Задачи'},{id:'docs',icon:<FileText size={16}/>,l:'Документы'},{id:'meetings',icon:<Users size={16}/>,l:'Встречи'}, {id:'backlog',icon:<Layout size={16}/>,l:'Бэклог'}].map(t => (
                                    <div key={t.id} onClick={() => setNewTableType(t.id as any)} className={`cursor-pointer border rounded-lg p-2 text-center text-xs flex flex-col items-center gap-1 transition-all ${newTableType === t.id ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-500' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                                        {t.icon}{t.l}
                                    </div>
                                ))}
                            </div>
                        </div>
                     )}

                     {newTableType === 'tasks' && (
                         <div>
                             <label className="block text-xs font-bold text-gray-500 mb-2">Отображение</label>
                             <div className="space-y-2 bg-gray-50 dark:bg-notion-dark-bg p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                 <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded transition-colors">
                                     <input type="checkbox" checked={newTableViewConfig.showTable} onChange={e => setNewTableViewConfig({...newTableViewConfig, showTable: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-gray-300"/> 
                                     <span className="flex items-center gap-2"><LayoutList size={14}/> Таблица</span>
                                 </label>
                                 <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded transition-colors">
                                     <input type="checkbox" checked={newTableViewConfig.showKanban} onChange={e => setNewTableViewConfig({...newTableViewConfig, showKanban: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-gray-300"/> 
                                     <span className="flex items-center gap-2"><KanbanIcon size={14}/> Канбан Доска</span>
                                 </label>
                                 <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded transition-colors">
                                     <input type="checkbox" checked={newTableViewConfig.showGantt} onChange={e => setNewTableViewConfig({...newTableViewConfig, showGantt: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-gray-300"/> 
                                     <span className="flex items-center gap-2"><Calendar size={14}/> Таймлайн (Гант)</span>
                                 </label>
                             </div>
                         </div>
                     )}

                     <div>
                         <label className="block text-xs font-bold text-gray-500 mb-2">Иконка</label>
                         <div className="grid grid-cols-6 gap-2 bg-gray-50 dark:bg-notion-dark-bg p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                             {ICON_OPTIONS.map(icon => (
                                 <div key={icon} onClick={() => setNewTableIcon(icon)} className={`p-2 rounded-lg cursor-pointer flex justify-center transition-all ${newTableIcon === icon ? 'bg-white shadow-md text-blue-600 ring-1 ring-blue-500 scale-110' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}>
                                     {getDynamicIcon(icon, 'currentColor', 18)}
                                 </div>
                             ))}
                         </div>
                     </div>
                     
                     <div>
                         <label className="block text-xs font-bold text-gray-500 mb-2">Цвет</label>
                         <div className="grid grid-cols-9 gap-2">
                             {COLOR_OPTIONS.map(c => (
                                 <div key={c} onClick={() => setNewTableColor(c)} className={`w-6 h-6 rounded-full cursor-pointer border-2 transition-all flex items-center justify-center ${newTableColor === c ? 'border-gray-900 scale-110' : 'border-transparent hover:border-gray-300'}`}>
                                     <div className={`w-full h-full rounded-full ${getColorStyles(c).solid}`}></div>
                                 </div>
                             ))}
                         </div>
                     </div>

                     <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 mt-4">
                         <button type="button" onClick={() => setIsCreateTableModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Отмена</button>
                         <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm">Сохранить</button>
                     </div>
                 </form>
             </div>
         </div>
       )}
    </div>
  );
};

export default App;
