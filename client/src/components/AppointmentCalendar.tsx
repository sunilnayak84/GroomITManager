import React, { useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { CalendarApi } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useAppointments } from '../hooks/use-appointments';
import { useWorkingHours } from '../hooks/use-working-hours';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import AppointmentForm from './AppointmentForm';
import { Button } from './ui/button';
import type { AppointmentWithRelations } from '@/lib/schema';
import type { EventInput } from '@fullcalendar/core';

const viewOptions = [
  { label: 'Month', value: 'dayGridMonth' },
  { label: 'Week', value: 'timeGridWeek' },
  { label: 'Day', value: 'timeGridDay' },
];

export default function AppointmentCalendar() {
  const [currentView, setCurrentView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('timeGridWeek');
  const [openNewForm, setOpenNewForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const calendarRef = useRef<FullCalendar | null>(null);
  
  const { data: appointments } = useAppointments();
  const { data: workingHours } = useWorkingHours();

  // Convert appointments to calendar events
  const events: EventInput[] = appointments?.map((appointment: AppointmentWithRelations) => ({
    id: appointment.id,
    title: `${appointment.pet.name} - ${appointment.customer.firstName} ${appointment.customer.lastName}`,
    start: new Date(appointment.date),
    end: (() => {
      const end = new Date(appointment.date);
      // Add service duration (default to 1 hour if not specified)
      end.setMinutes(end.getMinutes() + (appointment.service?.duration || 60));
      return end;
    })(),
    backgroundColor: (() => {
      switch (appointment.status) {
        case 'pending': return '#fbbf24'; // Yellow
        case 'confirmed': return '#60a5fa'; // Blue
        case 'completed': return '#34d399'; // Green
        case 'cancelled': return '#ef4444'; // Red
        default: return '#6b7280'; // Gray
      }
    })(),
    extendedProps: {
      status: appointment.status,
      petName: appointment.pet.name,
      customerName: `${appointment.customer.firstName} ${appointment.customer.lastName}`,
      groomerName: appointment.groomer.name,
    },
  })) || [];

  // Get business hours from working hours data
  const businessHours = workingHours?.map(schedule => ({
    daysOfWeek: [schedule.dayOfWeek],
    startTime: schedule.openingTime,
    endTime: schedule.closingTime,
  })) || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {viewOptions.map((option) => (
            <Button
              key={option.value}
              variant={currentView === option.value ? "default" : "outline"}
              onClick={() => {
                setCurrentView(option.value as typeof currentView);
                if (calendarRef.current) {
                  const calendar = calendarRef.current.getApi();
                  calendar.changeView(option.value);
                }
              }}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <Dialog open={openNewForm} onOpenChange={setOpenNewForm}>
          <DialogTrigger asChild>
            <Button>New Appointment</Button>
          </DialogTrigger>
          <AppointmentForm setOpen={setOpenNewForm} />
        </Dialog>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={currentView}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: ''
          }}
          events={events}
          businessHours={businessHours}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          selectable={true}
          select={(info) => {
            setSelectedDate(info.start);
            setOpenNewForm(true);
          }}
          eventClick={(info) => {
            // Handle event click - could show appointment details
            console.log('Event clicked:', info.event);
          }}
          slotMinTime={workingHours?.[0]?.openingTime || '09:00:00'}
          slotMaxTime={workingHours?.[0]?.closingTime || '17:00:00'}
          allDaySlot={false}
          slotDuration="00:15:00"
          expandRows={true}
          height="auto"
          contentHeight="auto"
        />
      </div>
    </div>
  );
}
