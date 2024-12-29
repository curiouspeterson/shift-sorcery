# ScheduleMe User Stories

This document outlines the key user stories for the ScheduleMe application, organized by functional area.

## 1. Authentication & Account Management

- [x] As a new user, I want to sign up with my email and password so that I can have an account in the system
- [x] As a returning user, I want to log in using my email and password so that I can access the application's dashboard
- [x] As a user, I want to log out at any time to keep my account secure
- [x] As a user who forgot my password, I want to reset it via email so that I can regain access to my account
- [x] As a manager, I want to invite a new employee via email so that they can set up their account

## 2. Profile & Role Management

- [x] As an employee, I want to view and update my basic profile info (first/last name, weekly hour limit, etc.) so that my account stays accurate
- [x] As a manager, I want to view a list of employees and see their roles (employee vs. manager) so that I can quickly identify who has managerial permissions
- [x] As a manager, I want to promote a user to manager role or demote them to employee role if needed
- [x] As an admin/manager, I want to delete or deactivate an employee's profile if they leave the company

## 3. Employee Management

- [x] As a manager, I want to create a new employee record (with name, email, role) so that I can add them to the scheduling system
- [x] As a manager, I want to seed test employees in bulk for demonstration or testing purposes
- [x] As a manager, I want to view all employees in a grid or list with quick details (role, weekly hours, upcoming shifts) so I can manage them easily
- [x] As a manager, I want to delete an employee's record if they are no longer with the company
- [x] As a manager, I want to see if an employee is already scheduled or near their weekly hour limit so I don't inadvertently overschedule them

## 4. Shift & Coverage Management

- [x] As a manager, I want to create a new shift (name, start time, end time, shift type) so that I can define the blocks of work needed each day
- [x] As a manager, I want to delete an existing shift if it's no longer needed
- [x] As a manager, I want to specify minimum coverage requirements (e.g., 6 employees needed for "Day Shift Early") so that the auto-scheduler respects staffing needs
- [x] As a manager, I want to see how many employees are assigned to each shift, and whether coverage is met or not, so I can fill in gaps
- [x] As a manager, I want to see if there is overstaffing on any shift so I can reassign employees to understaffed shifts if needed

## 5. Availability Management

- [x] As an employee, I want to set my weekly availability (e.g., days and times I can work) so that the manager or auto-scheduler does not assign me outside of those times
- [x] As an employee, I want to edit my availability if my schedule changes, so that the system knows the latest times I can work
- [x] As a manager, I want to view an employee's declared availability for each day to ensure that I schedule them only when they are available
- [x] As a manager, I want to seed test availability for employees in bulk for demonstration or testing

## 6. Time Off Requests

- [x] As an employee, I want to submit a time off request (start date, end date, reason) so that I can notify managers when I need leave
- [x] As an employee, I want to view my submitted requests (pending, approved, rejected) so I can keep track of my time off status
- [x] As a manager, I want to see all pending requests in a list so that I can approve or reject them
- [x] As a manager, I want to approve or reject a time off request, with an optional comment, so that I can manage employee absences effectively
- [x] As a manager, I want to see which employees are on time off for a given week so I can plan the schedule accordingly

## 7. Scheduling & Shift Assignments

- [x] As a manager, I want to automatically generate a weekly schedule (starting a chosen date) so that I can fill shifts according to coverage requirements, employee availability, and hours limits
- [x] As a manager, I want to manually edit the weekly schedule after auto-generation if the assignment logic didn't match my expectations
- [x] As a manager, I want to publish a schedule so that employees can see their final assigned shifts
- [x] As a manager, I want to delete a schedule for a given week if it was created in error or needs a complete reset
- [x] As an employee, I want to view my upcoming assigned shifts so that I know when and where to work
- [x] As an employee, I want to see any changes to the published schedule (shift changes, reassignments) so I can keep up to date
- [x] As a manager, I want to keep track of employees' weekly hour totals so that I don't exceed their stated limit or labor law requirements

## 8. Shift Swapping (Future Enhancement)

- [ ] As an employee, I want to request a swap for an assigned shift if I cannot work it
- [ ] As an employee (another coworker), I want to volunteer to take a shift from an employee requesting a swap if I'm available
- [ ] As a manager, I want to see swap requests and approve or reject them so that the schedule remains accurate

## 9. Dashboard & Status Views

- [x] As a manager, I want a dashboard that shows quick stats (e.g., how many employees scheduled today, coverage alerts, pending time off requests) so I have an at-a-glance overview
- [x] As any user, I want to see the current status or release notes (e.g., in a "STATUS.md" or "About" page) so that I understand the application's known issues or recent changes
- [x] As an admin/manager, I want to see an error or conflict log if the scheduling algorithm fails or if there are coverage issues, so I can fix them

## 10. Notifications & Alerts (Future Enhancement)

- [ ] As an employee, I want to be notified via email/push when my schedule is published or changed so I don't miss any updates
- [ ] As an employee, I want to receive reminders about upcoming shifts or time-off outcomes so that I stay informed
- [ ] As a manager, I want to be notified if an employee modifies their availability so I can regenerate schedules if needed

## 11. Reporting & Analytics (Future Enhancement)

- [ ] As a manager, I want to see a report of total hours scheduled per employee for a date range so that I can do payroll and budget analysis
- [ ] As a manager, I want to export the schedule to PDF or Excel so that I can share it with third parties or post it in the workplace
- [ ] As an HR admin, I want advanced analytics on shift coverage, overtime, or labor costs to optimize staffing

## 12. Mobile Responsiveness & Accessibility

- [x] As any user, I want to access the app on my smartphone without layout issues so that I can review the schedule or requests on the go
- [ ] As any user, I want the interface to be accessible (screen readers, keyboard navigation) so that it meets accessibility standards

Note: Checkmarks [x] indicate features that are currently implemented. Unchecked boxes [ ] represent planned future enhancements.