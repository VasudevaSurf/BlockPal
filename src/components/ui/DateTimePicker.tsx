// src/components/ui/DateTimePicker.tsx - Fixed DateTime Picker Components
"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, Clock, ChevronLeft, ChevronRight, X } from "lucide-react";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className = "",
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value + "T00:00:00") : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const today = new Date();

  const isToday = (day: number) => {
    return (
      currentMonth.getFullYear() === today.getFullYear() &&
      currentMonth.getMonth() === today.getMonth() &&
      day === today.getDate()
    );
  };

  const isSelected = (day: number) => {
    return (
      selectedDate &&
      currentMonth.getFullYear() === selectedDate.getFullYear() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      day === selectedDate.getDate()
    );
  };

  const isPastDate = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    return date < todayStart;
  };

  const handleDateSelect = (day: number) => {
    if (isPastDate(day)) return;

    // Fix: Create date in local timezone and format as YYYY-MM-DD
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const formattedDate = `${year}-${(month + 1)
      .toString()
      .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

    onChange(formattedDate);
    setIsOpen(false);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      if (direction === "prev") {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return placeholder;
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const clearDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  const getQuickDate = (daysFromToday: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromToday);
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    return `${year}-${(month + 1).toString().padStart(2, "0")}-${day
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-black border border-[#2C2C2C] rounded-lg px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-[#E2AF19] transition-colors text-left flex items-center justify-between"
      >
        <div className="flex items-center">
          <Calendar size={16} className="text-gray-400 mr-2" />
          <span className={value ? "text-white" : "text-gray-400"}>
            {formatDisplayDate(value)}
          </span>
        </div>
        <div className="flex items-center">
          {value && (
            <button
              onClick={clearDate}
              className="text-gray-400 hover:text-white mr-2 p-1"
            >
              <X size={14} />
            </button>
          )}
          <ChevronRight
            size={16}
            className={`text-gray-400 transform transition-transform ${
              isOpen ? "rotate-90" : ""
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-black border border-[#2C2C2C] rounded-lg shadow-xl p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth("prev")}
              className="p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
            >
              <ChevronLeft size={16} className="text-gray-400" />
            </button>

            <h3 className="text-white font-semibold font-satoshi">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>

            <button
              onClick={() => navigateMonth("next")}
              className="p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
            >
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <div
                key={day}
                className="text-center text-gray-400 text-xs font-satoshi py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before the first day of the month */}
            {Array.from({ length: firstDayOfMonth }, (_, i) => (
              <div key={`empty-${i}`} className="h-8"></div>
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              return (
                <button
                  key={day}
                  onClick={() => handleDateSelect(day)}
                  disabled={isPastDate(day)}
                  className={`
                    h-8 w-8 rounded-lg text-sm font-satoshi transition-colors
                    ${
                      isPastDate(day)
                        ? "text-gray-600 cursor-not-allowed"
                        : "text-white hover:bg-[#2C2C2C] cursor-pointer"
                    }
                    ${
                      isSelected(day) ? "bg-[#E2AF19] text-black font-bold" : ""
                    }
                    ${
                      isToday(day) && !isSelected(day)
                        ? "bg-blue-600/30 text-blue-400"
                        : ""
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-4 pt-3 border-t border-[#2C2C2C]">
            <button
              onClick={() => {
                onChange(getQuickDate(0));
                setIsOpen(false);
              }}
              className="flex-1 bg-[#2C2C2C] text-white px-3 py-2 rounded-lg text-sm font-satoshi hover:bg-[#3C3C3C] transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => {
                onChange(getQuickDate(1));
                setIsOpen(false);
              }}
              className="flex-1 bg-[#2C2C2C] text-white px-3 py-2 rounded-lg text-sm font-satoshi hover:bg-[#3C3C3C] transition-colors"
            >
              Tomorrow
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
  className = "",
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayTime = value
    ? (() => {
        const [hours, minutes] = value.split(":").map(Number);
        const period = hours >= 12 ? "PM" : "AM";
        const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return `${displayHour}:${minutes
          .toString()
          .padStart(2, "0")} ${period}`;
      })()
    : placeholder;

  const clearTime = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  // Simplified quick time options
  const quickTimes = [
    {
      label: "Now",
      value: () => {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, "0")}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;
      },
    },
    { label: "9:00 AM", value: () => "09:00" },
    { label: "12:00 PM", value: () => "12:00" },
    { label: "2:00 PM", value: () => "14:00" },
    { label: "5:00 PM", value: () => "17:00" },
    { label: "6:00 PM", value: () => "18:00" },
    { label: "8:00 PM", value: () => "20:00" },
    { label: "10:00 PM", value: () => "22:00" },
  ];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-black border border-[#2C2C2C] rounded-lg px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-[#E2AF19] transition-colors text-left flex items-center justify-between"
      >
        <div className="flex items-center">
          <Clock size={16} className="text-gray-400 mr-2" />
          <span className={value ? "text-white" : "text-gray-400"}>
            {displayTime}
          </span>
        </div>
        <div className="flex items-center">
          {value && (
            <button
              onClick={clearTime}
              className="text-gray-400 hover:text-white mr-2 p-1"
            >
              <X size={14} />
            </button>
          )}
          <ChevronRight
            size={16}
            className={`text-gray-400 transform transition-transform ${
              isOpen ? "rotate-90" : ""
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-black border border-[#2C2C2C] rounded-lg shadow-xl p-4">
          <h3 className="text-white font-semibold font-satoshi mb-3 text-center">
            Select Time
          </h3>

          {/* Simplified Time Input */}
          <div className="mb-4">
            <input
              type="time"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full bg-[#2C2C2C] border border-[#4C4C4C] rounded-lg px-3 py-2 text-white font-satoshi text-center focus:outline-none focus:border-[#E2AF19] text-lg"
            />
          </div>

          {/* Quick Time Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {quickTimes.map((time) => (
              <button
                key={time.label}
                onClick={() => {
                  onChange(time.value());
                  setIsOpen(false);
                }}
                className="bg-[#2C2C2C] text-white px-3 py-2 rounded-lg text-sm font-satoshi hover:bg-[#3C3C3C] transition-colors"
              >
                {time.label}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-3 border-t border-[#2C2C2C]">
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 bg-[#4B3A08] text-[#E2AF19] px-3 py-2 rounded-lg text-sm font-satoshi hover:opacity-90 transition-opacity"
            >
              Cancel
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 bg-[#E2AF19] text-black px-3 py-2 rounded-lg text-sm font-satoshi font-medium hover:bg-[#D4A853] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
