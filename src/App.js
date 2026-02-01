import './App.css';
import { useState, useMemo, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { logout, subscribeToAuthChanges } from './utils/auth';
import Login from './components/Login';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateShort(dateStr) {
  const [year, month, day] = dateStr.split('-');
  const monthIndex = parseInt(month) - 1;
  return `${MONTHS_SHORT[monthIndex]} ${parseInt(day)}`;
}

function getCalendarDays(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startWeekday = first.getDay();
  const daysInMonth = last.getDate();
  const today = toYMD(new Date());

  const days = [];
  // leading empty cells
  for (let i = 0; i < startWeekday; i++) {
    const prevMonth = new Date(year, month, 1 - (startWeekday - i));
    days.push({
      date: toYMD(prevMonth),
      day: prevMonth.getDate(),
      isCurrentMonth: false,
      isToday: toYMD(prevMonth) === today,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      date: dateStr,
      day: d,
      isCurrentMonth: true,
      isToday: dateStr === today,
    });
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const nextMonth = new Date(year, month + 1, i);
    days.push({
      date: toYMD(nextMonth),
      day: nextMonth.getDate(),
      isCurrentMonth: false,
      isToday: toYMD(nextMonth) === today,
    });
  }
  return days;
}

function App() {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({
    title: '',
    date: '',
    time: '',
    notes: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Authentication state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);



  const calendarDays = useMemo(() => getCalendarDays(viewMonth), [viewMonth]);

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load schedules on component mount
  useEffect(() => {
    if (!user) return;
    
    const schedulesRef = collection(db, 'schedules');
    const q = query(schedulesRef, where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scheduleArray = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setEntries(scheduleArray);
    });

    return () => unsubscribe();
  }, [user]);

  const getSchedulesForDate = (dateStr) =>
    entries.filter((e) => e.date === dateStr);

  const resetForm = () => {
    setForm({
      title: '',
      date: selectedDate || '',
      time: '',
      notes: '',
    });
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;

    try {
      if (editingId !== null) {
        // Update existing entry
        const entryRef = doc(db, 'schedules', editingId);
        await updateDoc(entryRef, {
          title: form.title,
          date: form.date,
          time: form.time,
          notes: form.notes,
          updatedAt: new Date()
        });
      } else {
        // Create new entry
        const payload = {
          title: form.title,
          date: form.date,
          time: form.time,
          notes: form.notes,
          userId: user.uid,
          createdAt: new Date()
        };
        // helpful debug log
        // eslint-disable-next-line no-console
        console.log('Saving schedule to Firestore', payload);
        const docRef = await addDoc(collection(db, 'schedules'), payload);
        // eslint-disable-next-line no-console
        console.log('Saved schedule id:', docRef.id);
      }

      setForm({ title: '', date: selectedDate || '', time: '', notes: '' });
      setEditingId(null);
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Failed to save schedule. Please try again.');
    }
  };

  const handleEdit = (id) => {
    const entry = entries.find((item) => item.id === id);
    if (!entry) return;
    setForm({
      title: entry.title,
      date: entry.date,
      time: entry.time || '',
      notes: entry.notes || '',
    });
    setEditingId(id);
    setSelectedDate(entry.date);
  };

  const handleDelete = async (id) => {
    try {
      const entryRef = doc(db, 'schedules', id);
      await deleteDoc(entryRef);
      
      if (editingId === id) {
        resetForm();
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule. Please try again.');
    }
  };

  // Auth handlers
  const handleLogout = async () => {
    try {
      await logout();
      setEntries([]);
      resetForm();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const goPrevMonth = () => {
    setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  };

  const goNextMonth = () => {
    setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1));
  };

  const goToday = () => {
    const today = new Date();
    setViewMonth(today);
    setSelectedDate(toYMD(today));
    setForm((prev) => ({ ...prev, date: toYMD(today) }));
  };

  const [modalOpen, setModalOpen] = useState(false);

  const handleDayClick = (dateStr) => {
    setSelectedDate(dateStr);
    setForm((prev) => ({ ...prev, date: dateStr, title: '', time: '', notes: '' }));
    setEditingId(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm((prev) => ({ ...prev, title: '', time: '', notes: '' }));
    setEditingId(null);
  };

  const daySchedules = selectedDate
    ? [...entries.filter((e) => e.date === selectedDate)].sort((a, b) => {
        const aKey = `${a.date || ''} ${a.time || ''}`;
        const bKey = `${b.date || ''} ${b.time || ''}`;
        return aKey.localeCompare(bKey);
      })
    : [];

  const overallSchedules = useMemo(
    () => {
      const today = toYMD(new Date());
      return [...entries]
        .filter((e) => e.date >= today)
        .sort((a, b) => {
          const aKey = `${a.date || ''} ${a.time || ''}`;
          const bKey = `${b.date || ''} ${b.time || ''}`;
          return aKey.localeCompare(bKey);
        });
    },
    [entries]
  );

  const openDayModal = (dateStr) => {
    setSelectedDate(dateStr);
    setForm((prev) => ({ ...prev, date: dateStr, title: '', time: '', notes: '' }));
    setEditingId(null);
    setModalOpen(true);
  };



  // Show loading state
  if (authLoading) {
    return <div className="App"><div className="login-page"><p>Loading...</p></div></div>;
  }

  // Show login page if not authenticated
  if (!user) {
    return (
      <div className="App">
        <Login />
      </div>
    );
  }

  return (
    <div className="App">
        <div className="app-shell">
          <header className="app-header">
            <div>
              <h1>Schedule</h1>
              <p>Click a day to add or edit schedules</p>
            </div>
            <button type="button" className="btn ghost logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </header>

        <div className="app-layout">
          <aside className="schedule-sidebar card">
            <div className="schedule-sidebar-header">
              <h2>Upcoming schedules</h2>
              <span className="badge">{overallSchedules.length}</span>
            </div>
            {overallSchedules.length === 0 ? (
              <p className="empty-state">No schedules yet. Click a day on the calendar to add one.</p>
            ) : (
              <ul className="overall-schedule-list">
                {overallSchedules.map((item) => (
                  <li key={item.id} className="overall-schedule-item">
                    <button
                      type="button"
                      className="overall-schedule-btn"
                      onClick={() => openDayModal(item.date)}
                      title={`${item.date}${item.time ? ` ${item.time}` : ''} · ${item.title}`}
                    >
                      <div className="overall-schedule-left">
                        <span className="overall-schedule-date">{formatDateShort(item.date)}</span>
                        <span className="overall-schedule-time">{item.time || '—'}</span>
                      </div>
                      <span className="overall-schedule-title">{item.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <div className="calendar-container">
            <section className="calendar-section card">
          <div className="calendar-header">
            <button type="button" className="btn ghost calendar-nav" onClick={goPrevMonth} aria-label="Previous month">
              ←
            </button>
            <h2 className="calendar-title">
              {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </h2>
            <button type="button" className="btn ghost calendar-nav" onClick={goNextMonth} aria-label="Next month">
              →
            </button>
            <button type="button" className="btn small calendar-today" onClick={goToday}>
              Today
            </button>
          </div>
          <div className="calendar-grid">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="calendar-weekday">{wd}</div>
            ))}
            {calendarDays.map((cell) => {
              const schedules = getSchedulesForDate(cell.date);
              const isSelected = selectedDate === cell.date;
              return (
                <button
                  key={cell.date}
                  type="button"
                  className={`calendar-day ${!cell.isCurrentMonth ? 'other-month' : ''} ${cell.isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleDayClick(cell.date)}
                >
                  <span className="calendar-day-num">{cell.day}</span>
                  <div className="calendar-day-schedules">
                    {schedules.slice(0, 3).map((s) => (
                      <span key={s.id} className="calendar-schedule-pill" title={s.title}>
                        {s.title}
                      </span>
                    ))}
                    {schedules.length > 3 && (
                      <span className="calendar-schedule-more">+{schedules.length - 3}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
            </section>
          </div>
        </div>
        </div>

      {modalOpen && selectedDate && (
        <div className="modal-backdrop" onClick={closeModal} aria-hidden="true">
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Schedule for {selectedDate}</h2>
              <button type="button" className="modal-close" onClick={closeModal} aria-label="Close">
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} className="schedule-form">
                <div className="form-row">
                  <label htmlFor="modal-title">Title *</label>
                  <input
                    id="modal-title"
                    name="title"
                    type="text"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="Meeting, task, event…"
                    required
                  />
                </div>
                <div className="form-row two-columns">
                  <div>
                    <label htmlFor="modal-date">Date *</label>
                    <input
                      id="modal-date"
                      name="date"
                      type="date"
                      value={form.date}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-time">Time</label>
                    <input
                      id="modal-time"
                      name="time"
                      type="time"
                      value={form.time}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <label htmlFor="modal-notes">Notes</label>
                  <textarea
                    id="modal-notes"
                    name="notes"
                    rows="2"
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Optional details"
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn primary">
                    {editingId ? 'Save changes' : 'Add schedule'}
                  </button>
                  {editingId && (
                    <button type="button" className="btn ghost" onClick={handleCancelEdit}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              <div className="modal-day-list">
                <h3>On this day</h3>
                {daySchedules.length === 0 ? (
                  <p className="empty-state">No schedules yet. Add one above.</p>
                ) : (
                  <ul className="entry-list">
                    {daySchedules.map((item) => (
                      <li key={item.id} className="entry-item">
                        <div className="entry-main">
                          <div className="entry-title-row">
                            <h4>{item.title}</h4>
                            <span className="entry-datetime">
                              {item.time || '—'}
                            </span>
                          </div>
                          {item.notes && <p className="entry-notes">{item.notes}</p>}
                        </div>
                        <div className="entry-actions">
                          <button type="button" className="btn small" onClick={() => handleEdit(item.id)}>Edit</button>
                          <button type="button" className="btn small danger" onClick={() => handleDelete(item.id)}>Delete</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
