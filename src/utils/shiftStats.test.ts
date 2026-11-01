import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDateToKey,
  getMondayOfWeek,
  getWeekDates,
  filterUsersByDepartment,
  inferDepartmentFromPosition,
  isOffShift,
  calculateShiftStatsForDay,
  calculateWeeklyShiftStats,
  type User,
  type ShiftCatalogItem
} from './shiftStats.ts';

const mockUsers: User[] = [
  { id: 'u1', name: 'Nguyễn Văn A', department: 'Kỹ Thuật', position: 'Kỹ sư', status: 'ACTIVE' },
  { id: 'u2', name: 'Trần Thị B', department: 'Vận Hành', position: 'Điều hành', status: 'ACTIVE' },
  { id: 'u3', name: 'Lê Văn C', department: 'Kỹ Thuật', position: 'Kỹ thuật viên', status: 'ACTIVE' },
  { id: 'u4', name: 'Phạm Thị D', department: 'CNTT', position: 'Lập trình', status: 'INACTIVE' }, // inactive
];

const mockCatalog: ShiftCatalogItem[] = [
  { code: 'M', name: 'Ca sáng', time: '06:00 - 14:00' },
  { code: 'E', name: 'Ca chiều', time: '14:00 - 22:00' },
  { code: 'N', name: 'Ca đêm', time: '22:00 - 06:00' },
  { code: 'D', name: 'Hành chính', time: '08:00 - 17:00' },
  { code: 'DO', name: 'Nghỉ tuần', time: 'Off' },
];

test('formatDateToKey formats Date to YYYY-MM-DD correctly', () => {
  const d = new Date(2026, 9, 31); // October 31, 2026
  assert.equal(formatDateToKey(d), '2026-10-31');
});

test('getMondayOfWeek finds Monday correctly', () => {
  // 2026-10-31 is a Saturday
  const sat = new Date(2026, 9, 31);
  const mon = getMondayOfWeek(sat);
  assert.equal(mon.getDay(), 1); // Monday
  assert.equal(formatDateToKey(mon), '2026-10-26');
});

test('getWeekDates returns 7 consecutive days starting from Monday', () => {
  const d = new Date(2026, 9, 31);
  const week = getWeekDates(d);
  assert.equal(week.length, 7);
  assert.equal(week[0].dateStr, '2026-10-26');
  assert.equal(week[6].dateStr, '2026-11-01');
});

test('filterUsersByDepartment filters active users and department properly', () => {
  const allActive = filterUsersByDepartment(mockUsers, 'all');
  assert.equal(allActive.length, 3); // excludes u4 who is inactive

  const kyThuatOnly = filterUsersByDepartment(mockUsers, 'Kỹ Thuật');
  assert.equal(kyThuatOnly.length, 2);
  assert.deepEqual(kyThuatOnly.map(u => u.id), ['u1', 'u3']);

  const vanHanhOnly = filterUsersByDepartment(mockUsers, 'Vận Hành');
  assert.equal(vanHanhOnly.length, 1);
  assert.equal(vanHanhOnly[0].id, 'u2');
});

test('inferDepartmentFromPosition defaults or infers correctly', () => {
  assert.equal(inferDepartmentFromPosition('Kỹ Thuật Viên'), 'Kỹ Thuật');
  assert.equal(inferDepartmentFromPosition('Quản Lý Vận Hành'), 'Vận Hành');
  assert.equal(inferDepartmentFromPosition('Kỹ Sư Hệ Thống IT'), 'CNTT & Hệ Thống');
  assert.equal(inferDepartmentFromPosition('Chuyên Viên CSKH'), 'Dịch Vụ Khách Hàng');
  assert.equal(inferDepartmentFromPosition('Bảo Trì Thiết Bị'), 'Bảo Trì & Thiết Bị');
});

test('isOffShift identifies off codes', () => {
  assert.equal(isOffShift('DO'), true);
  assert.equal(isOffShift('AL'), true);
  assert.equal(isOffShift('PH'), true);
  assert.equal(isOffShift('M'), false);
  assert.equal(isOffShift('E'), false);
  assert.equal(isOffShift('N'), false);
});

test('calculateShiftStatsForDay computes shift counts and on-duty correctly', () => {
  const schedules: Record<string, Record<string, string>> = {
    '2026-10-26': {
      u1: 'M',
      u2: 'E',
      u3: 'DO',
    },
  };
  const activeUsers = mockUsers.filter(u => u.status !== 'INACTIVE');
  const stats = calculateShiftStatsForDay('2026-10-26', activeUsers, schedules, mockCatalog);

  assert.equal(stats.totalPersonnel, 3);
  assert.equal(stats.totalOnDuty, 2); // u1 (M) + u2 (E)
  assert.equal(stats.totalOff, 1); // u3 (DO)
  assert.equal(stats.shiftCounts['M'], 1);
  assert.equal(stats.shiftCounts['E'], 1);
  assert.equal(stats.shiftCounts['DO'], 1);
  assert.equal(stats.shiftCounts['N'], 0);
  assert.equal(stats.shiftUsers['M'].length, 1);
  assert.equal(stats.shiftUsers['M'][0].id, 'u1');
});

test('calculateWeeklyShiftStats computes 7-day stats and totals', () => {
  const schedules: Record<string, Record<string, string>> = {
    '2026-10-26': { u1: 'M', u2: 'M', u3: 'DO' },
    '2026-10-27': { u1: 'E', u2: 'N', u3: 'M' },
    '2026-10-28': { u1: 'DO', u2: 'DO', u3: 'DO' },
  };
  const testDate = new Date(2026, 9, 26);
  const weekStats = calculateWeeklyShiftStats(testDate, mockUsers, schedules, mockCatalog, 'all');

  assert.equal(weekStats.dayStats.length, 7);
  // On 2026-10-26: u1: M, u2: M, u3: DO -> 2 on-duty, 1 off
  assert.equal(weekStats.dayStats[0].totalOnDuty, 2);
  assert.equal(weekStats.dayStats[0].totalOff, 1);
  assert.equal(weekStats.dayStats[0].shiftCounts['M'], 2);

  // On 2026-10-28: all DO -> 0 on-duty, 3 off
  assert.equal(weekStats.dayStats[2].totalOnDuty, 0);
  assert.equal(weekStats.dayStats[2].totalOff, 3);

  // Filtering by department
  const deptStats = calculateWeeklyShiftStats(testDate, mockUsers, schedules, mockCatalog, 'Vận Hành');
  // Only u2 is Vận Hành
  assert.equal(deptStats.dayStats[0].totalPersonnel, 1);
  assert.equal(deptStats.dayStats[0].shiftCounts['M'], 1);
});

test('sortUsersByAdminOrder preserves exact order property from user management', () => {
  const unorderedUsers: User[] = [
    { id: 'c', name: 'Nguyễn Văn C', status: 'ACTIVE', order: 2 },
    { id: 'a', name: 'Trần Văn A', status: 'ACTIVE', order: 0 },
    { id: 'b', name: 'Lê Văn B', status: 'ACTIVE', order: 1 },
    { id: 'd', name: 'Phạm Văn D', status: 'INACTIVE', order: 3 },
  ];

  const sorted = [...unorderedUsers].sort((x, y) => (x.order || 0) - (y.order || 0));
  assert.deepEqual(sorted.map(u => u.id), ['a', 'b', 'c', 'd']);

  const activeOnly = sorted.filter(u => u.status !== 'INACTIVE');
  assert.deepEqual(activeOnly.map(u => u.id), ['a', 'b', 'c']);
});

test('isAllowedNotification identifies task and shift notification types only', () => {
  function isAllowed(n: { type?: string; title?: string; message?: string }): boolean {
    if (!n) return false;
    if (n.type) return n.type === 'task' || n.type === 'shift';
    const text = ((n.title || '') + ' ' + (n.message || '')).toLowerCase();
    return text.includes('task') || text.includes('công việc') || text.includes('tiến độ') || text.includes('việc mới') || text.includes('ca') || text.includes('phân ca') || text.includes('lịch làm');
  }

  assert.equal(isAllowed({ type: 'task' }), true);
  assert.equal(isAllowed({ type: 'shift' }), true);
  assert.equal(isAllowed({ type: 'system' }), false);
  assert.equal(isAllowed({ type: 'login' }), false);
  assert.equal(isAllowed({ title: 'Cập nhật tiến độ: Báo cáo' }), true);
  assert.equal(isAllowed({ title: 'Đổi phân ca làm việc' }), true);
  assert.equal(isAllowed({ title: 'Người dùng vừa đăng nhập' }), false);
});

test('parseLocalDate and getMondayOfWeek correctly identify Monday without timezone shift', () => {
  const mon1 = getMondayOfWeek('2026-11-02');
  assert.equal(formatDateToKey(mon1), '2026-11-02');

  const mon2 = getMondayOfWeek('2026-11-08'); // Sunday of that week
  assert.equal(formatDateToKey(mon2), '2026-11-02');

  const mon3 = getMondayOfWeek('2026-11-04'); // Wednesday
  assert.equal(formatDateToKey(mon3), '2026-11-02');
});

test('deleteWebsite allows removing default websites down to empty or custom list', () => {
  const defaultWebsites = [
    { id: 'web_checklist', title: 'Checklist Công Việc' },
    { id: 'web_congtodien', title: 'Công Tơ Điện' },
    { id: 'web_tailieu', title: 'Tài Liệu Quy Trình' },
    { id: 'web_quanlykho', title: 'Quản Lý Kho' },
    { id: 'web_sheets', title: 'Google Sheets' },
    { id: 'web_looker', title: 'Looker Dashboard' },
  ];

  let websites = [...defaultWebsites];

  function deleteSite(id: string) {
    websites = websites.filter(s => s.id !== id);
  }

  // Admin deletes default sites one by one
  deleteSite('web_checklist');
  assert.equal(websites.some(w => w.id === 'web_checklist'), false);
  assert.equal(websites.length, 5);

  deleteSite('web_looker');
  assert.equal(websites.some(w => w.id === 'web_looker'), false);
  assert.equal(websites.length, 4);

  // Admin deletes all remaining default sites
  ['web_congtodien', 'web_tailieu', 'web_quanlykho', 'web_sheets'].forEach(id => deleteSite(id));
  assert.equal(websites.length, 0);
});
