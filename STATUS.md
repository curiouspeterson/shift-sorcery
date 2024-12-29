# ScheduleMe Application Status

## Overview
ScheduleMe is a web-based employee scheduling application designed to help managers create and manage work schedules while allowing employees to set their availability and request time off. The application uses Supabase for data persistence and authentication, React for the frontend, and follows modern web development practices.

## Database Schema

### Core Tables
- `profiles`: Stores user information and role (employee/manager)
  - Links to auth.users for authentication
  - Tracks weekly hour limits and role information
  - Primary source for employee data

- `shifts`: Defines available shift types and their time ranges
  - Includes start/end times and duration
  - Tracks maximum employee capacity
  - Categorizes shifts (Day Early, Day, Swing, Graveyard)

- `schedules`: Contains weekly schedule information
  - Tracks status (draft/published)
  - Links to creator (manager)
  - Organizes assignments by week

- `schedule_assignments`: Links employees to specific shifts
  - Tracks shift acknowledgment
  - Enables shift swapping
  - Records assignment dates

- `employee_availability`: Tracks when employees can work
  - Flexible time ranges per day
  - Not tied to specific shifts
  - Supports complex availability patterns

- `time_off_requests`: Manages employee time off requests
  - Tracks request status
  - Includes date ranges
  - Optional reason field

- `shift_swap_requests`: Handles shift trading between employees
  - Tracks requester and volunteer
  - Manages approval status
  - Links to specific assignments

- `coverage_requirements`: Defines minimum staffing needs
  - Supports peak period tracking
  - Role-specific requirements
  - Time-based staffing levels

### Key Relationships
- Each schedule can have multiple assignments
- Assignments link employees, shifts, and schedules
- Availability is tied to specific employees and days
- Time off requests are linked to employees
- Shift swaps reference specific schedule assignments

### Access Control
- Managers can view and modify all data
- Employees can:
  - View published schedules
  - Manage their availability
  - Submit time off requests
  - Request shift swaps
  - View their own assignments
- All users can view basic shift information

## Project Structure

```
src/
├── components/
│   ├── dashboard/
│   │   ├── SidebarMenu.tsx
│   │   └── SidebarProfile.tsx
│   ├── employees/
│   │   ├── availability/
│   │   ├── EmployeeCard.tsx
│   │   ├── EmployeeList.tsx
│   │   └── EmployeeUpcomingShifts.tsx
│   ├── schedule/
│   │   ├── ScheduleCalendar.tsx
│   │   ├── ScheduleControls.tsx
│   │   └── ShiftUtils.ts
│   └── ui/
│       └── [shadcn components]
├── hooks/
│   ├── useAvailableEmployees.ts
│   ├── useEmployeeData.ts
│   └── use-mobile.tsx
├── integrations/
│   └── supabase/
│       ├── client.ts
│       └── types.ts
├── pages/
│   └── dashboard/
│       ├── AvailabilityView.tsx
│       ├── ScheduleView.tsx
│       └── StatusView.tsx
└── utils/
    ├── scheduleUtils.ts
    ├── shiftTypeUtils.ts
    └── timeUtils.ts
```

## Working Features

### Authentication
- ✅ User authentication with email/password
- ✅ Role-based access (managers vs employees)
- ✅ Automatic profile creation on signup

### Employee Management
- ✅ View list of all employees
- ✅ Managers can create new employee profiles
- ✅ View individual employee details
- ✅ Employee profile management

### Availability Management
- ✅ Employees can set their weekly availability
- ✅ Availability is tied to specific days
- ✅ Managers can view all employee availability
- ✅ Individual availability calendar view

### Time Off Management
- ✅ Employees can submit time off requests
- ✅ Managers can approve/deny requests
- ✅ Status tracking for requests
- ✅ Time off calendar view

### Schedule Management
- ✅ Weekly schedule view
- ✅ Schedule generation for managers
- ✅ Schedule publishing system
- ✅ View published schedules
- ✅ Delete schedules

### Recent Improvements
- ✅ Enhanced shift capacity tracking
- ✅ More flexible employee availability system
- ✅ Added shift swap functionality
- ✅ Improved coverage requirements tracking
- ✅ Added schedule acknowledgment system

## Known Issues

### Schedule Generation
- ⚠️ Need to improve distribution of employees across shifts
- ⚠️ Better handling of peak periods
- ⚠️ More sophisticated employee preference matching

### UI/UX
- 📝 Mobile responsiveness needs enhancement
- 📝 Better visual feedback for conflicts
- 📝 More intuitive navigation
- 📝 Enhanced calendar interactions

## Upcoming Development Priorities

### Short Term (1-2 Months)
1. Implement shift swap workflow
2. Add notification system
3. Improve mobile responsiveness
4. Enhance error handling
5. Add comprehensive testing

### Medium Term (3-6 Months)
1. Implement advanced reporting
2. Add schedule templates
3. Integrate with external calendar systems
4. Enhance performance monitoring
5. Add data export capabilities

### Long Term (6+ Months)
1. Develop mobile app version
2. Add AI-powered scheduling suggestions
3. Implement payroll system integration
4. Add advanced analytics
5. Create team management features

## Technical Debt
- Improve test coverage
- Enhance error boundaries
- Add performance monitoring
- Refactor large components
- Improve state management patterns

## Security
- ✅ Row Level Security (RLS) implemented
- ✅ Role-based access control
- ✅ Secure authentication flow
- ✅ Protected API endpoints
- ✅ Data validation and sanitization

This status document will be updated as new features are added and issues are resolved.