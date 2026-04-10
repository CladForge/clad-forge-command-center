import { useState } from 'react';

const today = new Date();
const events = [
  { day: 10, title: 'Sprint Review — Fleet Dashboard', time: '10:00 AM', color: 'var(--brand)' },
  { day: 12, title: 'Client Call — BrightPath', time: '2:00 PM', color: 'var(--info)' },
  { day: 14, title: 'Proposal Due — Nexus Co.', time: '5:00 PM', color: 'var(--purple)' },
  { day: 15, title: 'Invoice #047 Due', time: 'All Day', color: 'var(--danger)' },
  { day: 18, title: 'Kickoff — AI Chatbot', time: '9:00 AM', color: 'var(--success)' },
  { day: 21, title: 'Design Review — Portal v2', time: '3:00 PM', color: 'var(--brand)' },
  { day: 25, title: 'Monthly Report', time: 'All Day', color: 'var(--purple)' },
  { day: 28, title: 'Sprint Planning', time: '10:00 AM', color: 'var(--info)' },
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  }
  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  }

  const dayEvents = events.filter(e => e.day === selectedDay);

  return (
    <div className="calendar-page">
      <div className="calendar-layout">
        <div className="calendar-main">
          <div className="calendar-nav">
            <button className="btn btn--ghost btn--sm" onClick={prevMonth}>&larr;</button>
            <h2 className="calendar-month">{monthNames[currentMonth]} {currentYear}</h2>
            <button className="btn btn--ghost btn--sm" onClick={nextMonth}>&rarr;</button>
          </div>
          <div className="calendar-grid">
            {dayNames.map(d => <div key={d} className="calendar-day-name">{d}</div>)}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} className="calendar-cell calendar-cell--empty" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const hasEvent = events.some(e => e.day === day);
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
              const isSelected = day === selectedDay;
              return (
                <div
                  key={day}
                  className={`calendar-cell ${isToday ? 'calendar-cell--today' : ''} ${isSelected ? 'calendar-cell--selected' : ''}`}
                  onClick={() => setSelectedDay(day)}
                >
                  <span className="calendar-cell-num">{day}</span>
                  {hasEvent && <span className="calendar-cell-dot" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="calendar-sidebar">
          <h3 className="calendar-sidebar-title">
            {monthNames[currentMonth]} {selectedDay}
          </h3>
          {dayEvents.length === 0 ? (
            <div className="calendar-empty">No events scheduled</div>
          ) : (
            <div className="calendar-events">
              {dayEvents.map((ev, i) => (
                <div key={i} className="calendar-event">
                  <div className="calendar-event-dot" style={{ background: ev.color }} />
                  <div>
                    <div className="calendar-event-title">{ev.title}</div>
                    <div className="calendar-event-time">{ev.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h4 className="calendar-sidebar-subtitle">Upcoming</h4>
          <div className="calendar-events">
            {events.filter(e => e.day > selectedDay).slice(0, 4).map((ev, i) => (
              <div key={i} className="calendar-event calendar-event--upcoming" onClick={() => setSelectedDay(ev.day)}>
                <div className="calendar-event-dot" style={{ background: ev.color }} />
                <div>
                  <div className="calendar-event-title">{ev.title}</div>
                  <div className="calendar-event-time">{monthNames[currentMonth]} {ev.day} &middot; {ev.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
