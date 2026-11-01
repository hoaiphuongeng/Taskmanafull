/**
 * Shift Statistics Utility Functions
 * Pure calculations for personnel shift statistics, week calendar matrix, and department filtering.
 */

export interface User {
  id: string;
  name: string;
  phone?: string;
  role?: string;
  status?: string;
  position?: string;
  department?: string;
  avatar?: string;
  nickname?: string;
  order?: number;
}

export interface ShiftCatalogItem {
  code: string;
  name: string;
  time: string;
  bg?: string;
  text?: string;
}

export interface DayShiftStats {
  dateStr: string;
  dayLabel: string;
  isToday: boolean;
  totalPersonnel: number;
  totalOnDuty: number;
  totalOff: number;
  shiftCounts: Record<string, number>;
  shiftUsers: Record<string, User[]>;
}

export interface WeekShiftStats {
  weekDates: { date: Date; dateStr: string; dayLabel: string; isToday: boolean }[];
  dayStats: DayShiftStats[];
  totalWeeklyPersonnelCount: number;
  totalWeeklyOnDutyCount: number;
  weeklyShiftTotals: Record<string, number>;
  activeCatalogCodes: ShiftCatalogItem[];
}

/**
 * Normalizes date string or Date object to noon local Date to prevent timezone drift
 */
export function parseLocalDate(d: Date | string): Date {
  if (!d) return new Date();
  if (d instanceof Date) {
    const copy = new Date(d);
    copy.setHours(12, 0, 0, 0);
    return copy;
  }
  const s = String(d).split('T')[0].trim();
  const parts = s.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(y, m, day, 12, 0, 0);
  }
  const res = new Date(d);
  res.setHours(12, 0, 0, 0);
  return res;
}

/**
 * Normalizes date to "YYYY-MM-DD" in local timezone
 */
export function formatDateToKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the Monday-to-Sunday 7-day range for a given date
 */
export function getMondayOfWeek(d: Date | string): Date {
  const date = parseLocalDate(d);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(12, 0, 0, 0);
  return monday;
}

/**
 * Generates the 7 days of the week starting from Monday
 */
export function getWeekDates(baseDate: Date = new Date()): { date: Date; dateStr: string; dayLabel: string; isToday: boolean }[] {
  const monday = getMondayOfWeek(baseDate);
  const todayStr = formatDateToKey(new Date());
  const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
  
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const dateStr = formatDateToKey(cur);
    const dayMonth = `${String(cur.getDate()).padStart(2, '0')}/${String(cur.getMonth() + 1).padStart(2, '0')}`;
    dates.push({
      date: cur,
      dateStr,
      dayLabel: `${dayNames[i]} (${dayMonth})`,
      isToday: dateStr === todayStr,
    });
  }
  return dates;
}

/**
 * Filter users by department
 */
export function filterUsersByDepartment(users: User[], departmentFilter: string): User[] {
  if (!departmentFilter || departmentFilter === 'all') {
    return users.filter(u => u.status !== 'INACTIVE');
  }
  return users.filter(u => {
    if (u.status === 'INACTIVE') return false;
    const userDept = (u.department || inferDepartmentFromPosition(u.position)).trim().toLowerCase();
    return userDept === departmentFilter.trim().toLowerCase();
  });
}

/**
 * Fallback to infer department from user position if department field is not yet set
 */
export function inferDepartmentFromPosition(position: string = ''): string {
  const pos = position.toLowerCase();
  if (pos.includes('vận hành') || pos.includes('quản lý')) return 'Vận Hành';
  if (pos.includes('kỹ thuật')) return 'Kỹ Thuật';
  if (pos.includes('cntt') || pos.includes('it') || pos.includes('hệ thống')) return 'CNTT & Hệ Thống';
  if (pos.includes('cskh') || pos.includes('khách hàng') || pos.includes('dịch vụ')) return 'Dịch Vụ Khách Hàng';
  if (pos.includes('bảo trì') || pos.includes('thiết bị')) return 'Bảo Trì & Thiết Bị';
  return 'Kỹ Thuật';
}

/**
 * Checks if a shift is a non-working shift (Day off, Annual Leave, etc.)
 */
export function isOffShift(shiftCode: string): boolean {
  const offCodes = ['DO', 'AL', 'PH', 'OFF', 'V'];
  return offCodes.includes(shiftCode.toUpperCase());
}

/**
 * Calculate shift statistics for a single date
 */
export function calculateShiftStatsForDay(
  dateStr: string,
  users: User[],
  schedules: Record<string, Record<string, string>>,
  shiftCatalog: ShiftCatalogItem[]
): DayShiftStats {
  const dateSchedule = schedules[dateStr] || {};
  const todayStr = formatDateToKey(new Date());
  
  const shiftCounts: Record<string, number> = {};
  const shiftUsers: Record<string, User[]> = {};
  
  // Initialize catalog shifts
  shiftCatalog.forEach(item => {
    shiftCounts[item.code] = 0;
    shiftUsers[item.code] = [];
  });
  
  let totalOnDuty = 0;
  let totalOff = 0;
  
  users.forEach(user => {
    const shiftCode = dateSchedule[user.id] || 'M';
    if (!shiftCounts[shiftCode]) {
      shiftCounts[shiftCode] = 0;
      shiftUsers[shiftCode] = [];
    }
    shiftCounts[shiftCode]++;
    shiftUsers[shiftCode].push(user);
    
    if (isOffShift(shiftCode)) {
      totalOff++;
    } else {
      totalOnDuty++;
    }
  });

  return {
    dateStr,
    dayLabel: dateStr,
    isToday: dateStr === todayStr,
    totalPersonnel: users.length,
    totalOnDuty,
    totalOff,
    shiftCounts,
    shiftUsers,
  };
}

/**
 * Calculates complete 7-day weekly statistics
 */
export function calculateWeeklyShiftStats(
  baseDate: Date,
  users: User[],
  schedules: Record<string, Record<string, string>>,
  shiftCatalog: ShiftCatalogItem[],
  departmentFilter: string = 'all'
): WeekShiftStats {
  const filteredUsers = filterUsersByDepartment(users, departmentFilter);
  const weekDates = getWeekDates(baseDate);
  
  const weeklyShiftTotals: Record<string, number> = {};
  shiftCatalog.forEach(s => {
    weeklyShiftTotals[s.code] = 0;
  });

  let totalWeeklyOnDutyCount = 0;

  const dayStats: DayShiftStats[] = weekDates.map(w => {
    const dStat = calculateShiftStatsForDay(w.dateStr, filteredUsers, schedules, shiftCatalog);
    dStat.dayLabel = w.dayLabel;
    dStat.isToday = w.isToday;

    totalWeeklyOnDutyCount += dStat.totalOnDuty;

    Object.entries(dStat.shiftCounts).forEach(([code, count]) => {
      weeklyShiftTotals[code] = (weeklyShiftTotals[code] || 0) + count;
    });

    return dStat;
  });

  // Filter catalog codes: show shifts that have at least 1 person this week OR core shifts
  const coreCodes = ['M', 'E', 'N', 'D', 'DO'];
  const activeCatalogCodes = shiftCatalog.filter(
    s => coreCodes.includes(s.code) || (weeklyShiftTotals[s.code] && weeklyShiftTotals[s.code] > 0)
  );

  return {
    weekDates,
    dayStats,
    totalWeeklyPersonnelCount: filteredUsers.length * 7,
    totalWeeklyOnDutyCount,
    weeklyShiftTotals,
    activeCatalogCodes,
  };
}
