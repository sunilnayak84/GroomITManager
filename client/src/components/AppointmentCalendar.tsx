import React, { useState, useRef, useMemo, useCallback } from 'react';
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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import type { AppointmentWithRelations } from '@/lib/schema';
import type { EventInput, BusinessHoursInput } from '@fullcalendar/core';
import { format } from 'date-fns';

const viewOptions = [
  { label: 'Month', value: 'dayGridMonth' },
  { label: 'Week', value: 'timeGridWeek' },
  { label: 'Day', value: 'timeGridDay' },
];

interface AppointmentCalendarProps {
  setSelectedAppointment: (appointment: AppointmentWithRelations | null) => void;
  setOpenDetails: (open: boolean) => void;
}

export default function AppointmentCalendar({ setSelectedAppointment, setOpenDetails }: AppointmentCalendarProps) {
  const [currentView, setCurrentView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>(() => 
    localStorage.getItem('calendarView') as 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' || 'timeGridWeek'
  );
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
      const duration = appointment.service?.reduce((total, service) => total + (service?.duration || 0), 0) || 30;
      end.setMinutes(end.getMinutes() + duration);
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
      ...appointment,
      status: appointment.status,
      petName: appointment.pet.name,
      customerName: `${appointment.customer.firstName} ${appointment.customer.lastName}`,
      groomerName: appointment.groomer.name,
      service: appointment.service,
      petImage: appointment.pet.image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${appointment.pet.name}`,
    },
    display: 'block',
    classNames: ['hover-trigger'],
  })) || [];

  // Transform working hours into business hours, breaks, and background events
  const { businessHours, nonBusinessDays, breakTimeEvents } = useMemo(() => {
    if (!workingHours) return { businessHours: [], nonBusinessDays: [], breakTimeEvents: [] };

    const hours: BusinessHoursInput[] = [];
    const closedDays: number[] = [];
    const breaks: EventInput[] = [];

    workingHours.forEach(schedule => {
      if (!schedule.isOpen) {
        closedDays.push(schedule.dayOfWeek);
        return;
      }

      // Add main working hours
      hours.push({
        daysOfWeek: [schedule.dayOfWeek],
        startTime: schedule.openingTime,
        endTime: schedule.closingTime,
        color: '#f3f4f6', // Light gray background for business hours
      });

      // Add break time events if break exists
      if (schedule.breakStart && schedule.breakEnd) {
        breaks.push({
          title: 'Break Time',
          startTime: schedule.breakStart,
          endTime: schedule.breakEnd,
          daysOfWeek: [schedule.dayOfWeek],
          display: 'background',
          color: '#fee2e2', // Light red background for break time
          classNames: ['break-time'],
          rendering: 'background',
          overlap: false,
          groupId: 'breakTimes'
        });
      }
    });

    return {
      businessHours: hours,
      nonBusinessDays: closedDays,
      breakTimeEvents: breaks
    };
  }, [workingHours]);

  const handleSlotSelect = useCallback((selectionInfo: { start: Date; end: Date }) => {
    const selectedStart = new Date(selectionInfo.start);
    setSelectedDate(selectedStart);
    setOpenNewForm(true);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {viewOptions.map((option) => (
            <Button
              key={option.value}
              variant={currentView === option.value ? "default" : "outline"}
              onClick={() => {
                const newView = option.value as typeof currentView;
                setCurrentView(newView);
                localStorage.setItem('calendarView', newView);
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
          <AppointmentForm
            setOpen={setOpenNewForm}
          />
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
          events={[...events, ...breakTimeEvents]}
          businessHours={businessHours}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          selectable={true}
          select={handleSlotSelect}
          eventClick={(info) => {
            // Ignore clicks on break time events
            if (info.event.groupId === 'breakTimes') return;

            const appointmentId = info.event.id;
            const appointment = appointments?.find(apt => apt.id === appointmentId);
            if (appointment) {
              setSelectedAppointment(appointment);
              setOpenDetails(true);
            }
          }}
          slotMinTime={workingHours?.[0]?.openingTime || '09:00:00'}
          slotMaxTime={workingHours?.[0]?.closingTime || '17:00:00'}
          allDaySlot={false}
          slotDuration="00:15:00"
          expandRows={true}
          height="auto"
          contentHeight="auto"
          hiddenDays={nonBusinessDays}
          selectConstraint="businessHours"
          eventConstraint="businessHours"
          slotEventOverlap={false}
          displayEventEnd={true}
          nowIndicator={true}
          viewClassNames="calendar-view"
          dayCellClassNames={(arg) => {
            return nonBusinessDays.includes(arg.date.getDay()) ? 'closed-day' : '';
          }}
          slotLaneClassNames={(arg) => {
            // Add classes for slots during break time
            // Skip if date is undefined
            if (!arg.date) return '';

            if (!arg.date) return '';

            const dayEvents = breakTimeEvents.filter(event =>
              event.daysOfWeek?.includes(arg.date!.getDay())
            );

            const isInBreakTime = dayEvents.some(event => {
              if (!event.startTime || !event.endTime) return false;

              const [breakStartHour, breakStartMinute] = event.startTime.split(':');
              const [breakEndHour, breakEndMinute] = event.endTime.split(':');

              const date = arg.date!;
              const breakStart = new Date(date);
              breakStart.setHours(parseInt(breakStartHour), parseInt(breakStartMinute));

              const breakEnd = new Date(date);
              breakEnd.setHours(parseInt(breakEndHour), parseInt(breakEndMinute));

              return date >= breakStart && date < breakEnd;
            });

            return isInBreakTime ? 'break-time-slot' : '';
          }}
          eventContent={(arg) => {
            const event = arg.event;
            const props = event.extendedProps;

            return {
              html: `
                <div class="p-1">
                  <div class="font-medium">${event.title}</div>
                  <div class="text-xs">${format(event.start!, 'HH:mm')}${event.end ? ` - ${format(event.end, 'HH:mm')}` : ''}</div>
                </div>
              `
            };
          }}
        />
      </div>
    </div>
  );
}