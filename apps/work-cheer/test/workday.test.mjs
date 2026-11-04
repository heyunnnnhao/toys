import assert from 'node:assert/strict'
import { test } from 'node:test'
import { defaults, getWorkday, migrateSettings } from '../src/workday.ts'

const settings = { ...defaults, monthlySalary: 3600, yearEndBonus: 4800 }
const november = (day, hour, minute = 0) => getWorkday(new Date(2026, 10, day, hour, minute), settings)

test('uses the selected month’s weekday count to convert monthly compensation', () => {
  const novemberFirstShift = november(2, 18)
  assert.equal(novemberFirstShift.monthWorkdays, 21)
  assert.equal(novemberFirstShift.todayPay.toFixed(4), (4000 / 21).toFixed(4))
  assert.equal(november(30, 18).monthPay.toFixed(4), '4000.0000')

  const decemberFirstShift = getWorkday(new Date(2026, 11, 1, 18), settings)
  assert.equal(decemberFirstShift.monthWorkdays, 23)
  assert.equal(decemberFirstShift.monthPay.toFixed(4), (4000 / 23).toFixed(4))
})

test('counts only elapsed paid time today and full past weekdays', () => {
  assert.equal(november(2, 8).todayPay, 0)
  assert.equal(november(2, 12, 45).workedHours, 3)
  assert.equal(november(2, 15).workedHours, 4.5)
  assert.equal(november(2, 22).progress, 1)
  assert.equal(november(7, 15).todayPay, 0)
  assert.equal(november(7, 15).monthPay.toFixed(4), (4000 * 5 / 21).toFixed(4))
})

test('migrates the saved hourly rate using the schedule and current month', () => {
  const old = { ...defaults, monthlySalary: undefined, yearEndBonus: undefined, hourlyRate: 20 }
  const migrated = migrateSettings(old, new Date(2026, 10, 2))
  assert.equal(migrated.monthlySalary, 3150)
  assert.equal(migrated.yearEndBonus, 0)
  assert.equal(migrateSettings({ ...old, hourlyRate: NaN }, new Date(2026, 10, 2)), null)
})
