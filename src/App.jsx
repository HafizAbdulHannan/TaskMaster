import React, { useState, useEffect } from 'react';
import { Plus, Check, Trash2, CalendarDays, ClipboardList, Bell } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import './App.css';

function App() {
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('tasks');
    if (saved) {
      return JSON.parse(saved);
    }
    return [
      { id: uuidv4(), text: 'Welcome to your premium task manager!', completed: false, category: 'Personal' },
      { id: uuidv4(), text: 'Try adding a new task with a reminder', completed: false, category: 'Work' }
    ];
  });
  const [inputValue, setInputValue] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [filter, setFilter] = useState('All');
  const [editingTimeId, setEditingTimeId] = useState(null);

  // Request notification permissions on load
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  // Set up the interval to check for reminders
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(currentTasks => {
        const now = new Date().getTime();
        let updated = false;

        const newTasks = currentTasks.map(task => {
          if (task.reminderTime && !task.notified && !task.completed) {
            const taskTime = new Date(task.reminderTime).getTime();
            if (now >= taskTime) {
              // Trigger Notification
              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification('Task Reminder 🔔', {
                    body: task.text,
                  });
                } catch (e) {
                  if (navigator.serviceWorker) {
                    navigator.serviceWorker.ready.then(registration => {
                      registration.showNotification('Task Reminder 🔔', { body: task.text });
                    });
                  } else {
                    alert(`Task Reminder: ${task.text}`);
                  }
                }
              } else {
                // Fallback if notifications are blocked or not supported
                alert(`Task Reminder: ${task.text}`);
              }
              updated = true;
              return { ...task, notified: true };
            }
          }
          return task;
        });

        return updated ? newTasks : currentTasks;
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Save tasks to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    // Request permission if they add a reminder and haven't granted it yet
    if (reminderTime && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const newTask = {
      id: uuidv4(),
      text: inputValue.trim(),
      completed: false,
      category: 'Task',
      reminderTime: reminderTime || null,
      notified: false
    };
    
    setTasks([newTask, ...tasks]);
    setInputValue('');
    setReminderTime('');
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const snoozeTask = (id, minutes) => {
    setTasks(tasks.map(task => {
      if (task.id === id) {
        const newTime = new Date(new Date().getTime() + minutes * 60000);
        // Format to YYYY-MM-DDTHH:mm local time
        const offset = newTime.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(newTime - offset)).toISOString().slice(0, 16);
        return { 
          ...task, 
          reminderTime: localISOTime, 
          notified: false 
        };
      }
      return task;
    }));
  };

  const updateTaskTime = (id, newTime) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, reminderTime: newTime || null, notified: false } : task
    ));
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'Active') return !task.completed;
    if (filter === 'Completed') return task.completed;
    return true;
  });

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  
  const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
  const today = new Date().toLocaleDateString('en-US', dateOptions);

  return (
    <div className="app-container">
      <main className="task-manager animate-slide-up">
        <header className="header glass-panel">
          <h1>TaskMaster</h1>
          <div className="date-display">
            <CalendarDays size={16} />
            <span>{today}</span>
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {completedCount} of {totalCount} tasks completed
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '0.5rem', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              background: 'var(--success-color)', 
              width: `${totalCount === 0 ? 0 : (completedCount / totalCount) * 100}%`,
              transition: 'width 0.5s ease'
            }}></div>
          </div>
        </header>

        <form onSubmit={handleAddTask} className="input-form animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="input-container">
            <input
              type="text"
              className="task-input"
              placeholder="What needs to be done?"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <input
              type="datetime-local"
              className="task-datetime"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              title="Set a reminder"
            />
            <button 
              type="submit" 
              className="add-btn" 
              disabled={!inputValue.trim()}
              aria-label="Add task"
            >
              <Plus size={24} />
            </button>
          </div>
        </form>

        <div className="filters animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {['All', 'Active', 'Completed'].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="task-list">
          {filteredTasks.length === 0 ? (
            <div className="empty-state glass-panel animate-pop-in">
              <ClipboardList className="empty-icon" />
              <h3>No tasks found</h3>
              <p>You're all caught up! Enjoy your day.</p>
            </div>
          ) : (
            filteredTasks.map((task, index) => (
              <div 
                key={task.id} 
                className={`task-item ${task.completed ? 'completed' : ''} animate-slide-up`}
                style={{ animationDelay: `${0.2 + (index * 0.05)}s` }}
              >
                <div 
                  className={`checkbox ${task.completed ? 'checked' : ''}`}
                  onClick={() => toggleTask(task.id)}
                >
                  <Check className="check-icon" />
                </div>
                
                <div className="task-content">
                  <span className="task-text">{task.text}</span>
                  <div className="task-meta">
                    {task.category && <span className="task-category">{task.category}</span>}
                    
                    {editingTimeId === task.id ? (
                      <input 
                        type="datetime-local" 
                        className="task-datetime inline-edit" 
                        defaultValue={task.reminderTime || ''}
                        onBlur={(e) => {
                          updateTaskTime(task.id, e.target.value);
                          setEditingTimeId(null);
                        }}
                        onKeyDown={(e) => {
                          if(e.key === 'Enter') {
                            updateTaskTime(task.id, e.target.value);
                            setEditingTimeId(null);
                          } else if (e.key === 'Escape') {
                            setEditingTimeId(null);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <span 
                        className={`task-reminder ${task.notified ? 'notified' : ''} ${!task.reminderTime ? 'empty-reminder' : ''}`}
                        onClick={() => setEditingTimeId(task.id)}
                        title="Click to edit reminder time"
                      >
                        <Bell size={12} />
                        {task.reminderTime ? new Date(task.reminderTime).toLocaleString([], {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : 'Set Reminder'}
                      </span>
                    )}

                    {task.notified && !task.completed && editingTimeId !== task.id && (
                      <div className="snooze-actions">
                        <button className="snooze-btn" onClick={() => snoozeTask(task.id, 15)}>+15m</button>
                        <button className="snooze-btn" onClick={() => snoozeTask(task.id, 60)}>+1h</button>
                        <button className="snooze-btn" onClick={() => snoozeTask(task.id, 1440)}>+1d</button>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  className="delete-btn"
                  onClick={() => deleteTask(task.id)}
                  aria-label="Delete task"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
