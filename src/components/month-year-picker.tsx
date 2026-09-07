"use client";

import { Calendar, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MONTH_NAMES = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
];

export interface MonthYearPickerProps {
  value: string; // formato "YYYY-MM"
  onChange: (value: string) => void;
  minYear?: number;
  maxYear?: number;
  className?: string;
}

export function MonthYearPicker({
  value,
  onChange,
  minYear = 2023,
  maxYear = 2028,
  className = "",
}: MonthYearPickerProps) {
  const [openDropdown, setOpenDropdown] = useState<"month" | "year" | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [yearStr, monthStr] = (value && /^\d{4}-\d{2}$/.test(value)
    ? value
    : new Date().toISOString().slice(0, 7)
  ).split("-");

  const currentYear = Number(yearStr);
  const currentMonthNum = Number(monthStr); // 1 a 12

  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => minYear + i,
  );

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectMonth = (monthIdx1: number) => {
    const formatted = `${currentYear}-${String(monthIdx1).padStart(2, "0")}`;
    onChange(formatted);
    setOpenDropdown(null);
  };

  const handleSelectYear = (yr: number) => {
    const formatted = `${yr}-${String(currentMonthNum).padStart(2, "0")}`;
    onChange(formatted);
    setOpenDropdown(null);
  };

  return (
    <div className={`mypicker-container ${className}`} ref={containerRef}>
      <div className="mypicker-pill">
        {/* Lado Mês: Ícone Calendário + Nome do Mês + Chevrons duplos */}
        <button
          type="button"
          className={`mypicker-btn mypicker-btn-month ${openDropdown === "month" ? "active" : ""}`}
          onClick={() =>
            setOpenDropdown((prev) => (prev === "month" ? null : "month"))
          }
          aria-expanded={openDropdown === "month"}
          title="Selecionar mês"
        >
          <Calendar size={15} className="mypicker-cal-icon" />
          <span className="mypicker-month-text">
            {MONTH_NAMES[currentMonthNum - 1]}
          </span>
          <span className="mypicker-arrows">
            <ChevronUp size={11} className="arrow-up" />
            <ChevronDown size={11} className="arrow-down" />
          </span>
        </button>

        {/* Linha divisora sutil entre mês e ano */}
        <span className="mypicker-divider" aria-hidden="true" />

        {/* Lado Ano: Ano numérico + Chevrons duplos */}
        <button
          type="button"
          className={`mypicker-btn mypicker-btn-year ${openDropdown === "year" ? "active" : ""}`}
          onClick={() =>
            setOpenDropdown((prev) => (prev === "year" ? null : "year"))
          }
          aria-expanded={openDropdown === "year"}
          title="Selecionar ano"
        >
          <span className="mypicker-year-text">{currentYear}</span>
          <span className="mypicker-arrows">
            <ChevronUp size={11} className="arrow-up" />
            <ChevronDown size={11} className="arrow-down" />
          </span>
        </button>
      </div>

      {/* DROPDOWN DE MESES (Fundo Branco com sombra e check) */}
      {openDropdown === "month" && (
        <div className="mypicker-dropdown mypicker-dropdown-months">
          <div className="mypicker-menu-list">
            {MONTH_NAMES.map((name, index) => {
              const monthNum = index + 1;
              const isSelected = monthNum === currentMonthNum;
              return (
                <button
                  key={name}
                  type="button"
                  className={`mypicker-item ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSelectMonth(monthNum)}
                >
                  <span className="mypicker-check-slot">
                    {isSelected && <Check size={14} strokeWidth={2.5} />}
                  </span>
                  <span className="mypicker-item-label">{name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* DROPDOWN DE ANOS (Fundo Branco com sombra e check) */}
      {openDropdown === "year" && (
        <div className="mypicker-dropdown mypicker-dropdown-years">
          <div className="mypicker-menu-list">
            {years.map((yr) => {
              const isSelected = yr === currentYear;
              return (
                <button
                  key={yr}
                  type="button"
                  className={`mypicker-item ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSelectYear(yr)}
                >
                  <span className="mypicker-check-slot">
                    {isSelected && <Check size={14} strokeWidth={2.5} />}
                  </span>
                  <span className="mypicker-item-label">{yr}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
