import React, { useState } from 'react'
import { Calendar, momentLocalizer, Views } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = momentLocalizer(moment)

const getLatestMonday = () => {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const latestMonday = new Date(today)
  latestMonday.setDate(today.getDate() - daysSinceMonday)
  return latestMonday
}

const adjustScheduleToCurrentWeek = (lessons) => {
  const latestMonday = getLatestMonday()

  return lessons.map((lesson) => {
    const lessonStart = new Date(lesson.start)
    const lessonEnd = new Date(lesson.end)
    const lessonDayOfWeek = lessonStart.getDay()

    const daysFromMonday = lessonDayOfWeek === 0 ? 6 : lessonDayOfWeek - 1

    const adjustedStartDate = new Date(latestMonday)
    adjustedStartDate.setDate(latestMonday.getDate() + daysFromMonday)
    adjustedStartDate.setHours(
      lessonStart.getHours(),
      lessonStart.getMinutes(),
      lessonStart.getSeconds()
    )

    const adjustedEndDate = new Date(adjustedStartDate)
    adjustedEndDate.setHours(
      lessonEnd.getHours(),
      lessonEnd.getMinutes(),
      lessonEnd.getSeconds()
    )

    return {
      title: lesson.title,
      start: adjustedStartDate,
      end: adjustedEndDate,
    }
  })
}

const BigCalendar = ({ data = [] }) => {
  const [view, setView] = useState(Views.WORK_WEEK)

  const handleOnChangeView = (selectedView) => {
    setView(selectedView)
  }

  const adjustedEvents = adjustScheduleToCurrentWeek(data)

  return (
    <div style={{ height: '550px', backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
      <Calendar
        localizer={localizer}
        events={adjustedEvents}
        startAccessor="start"
        endAccessor="end"
        views={["work_week", "day"]}
        view={view}
        style={{ height: "100%", color: 'var(--text-primary)' }}
        onView={handleOnChangeView}
        min={new Date(2025, 1, 0, 8, 0, 0)}
        max={new Date(2025, 1, 0, 17, 0, 0)}
      />
    </div>
  )
}

export default BigCalendar
