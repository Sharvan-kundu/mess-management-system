# Mess Management System

Lightweight college mess manager built with **Next.js (App Router)**, **Tailwind CSS**, **MongoDB + Mongoose**, **NextAuth (JWT) + bcrypt**, **React Hook Form + Zod** and **react-hot-toast**.

## Configuration

Copy `.env.example` to **`.env.local`** and set:

| Variable | What to put |
| --- | --- |
| `MONGODB_URI` | Your MongoDB / Atlas connection URL |
| `NEXTAUTH_URL` | Local URL for development; the deployed URL on Vercel |
| `NEXTAUTH_SECRET` | Random secret generated with the command below |
| `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | First admin account (used by `npm run seed`); password must not be empty |
| `SEED_DEMO_DATA` | Keep `false` unless you explicitly want sample users/menu |
| `SEED_STUDENT_PASSWORD` | Required only when `SEED_DEMO_DATA=true`; password must not be empty |

Generate `NEXTAUTH_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`.env.local` and other local env files are ignored by Git. Never commit database credentials, auth secrets, or seed passwords. `npm run check` validates the local app configuration and tests the MongoDB connection.

## Quick start

Use Node.js 20.9 or newer (the same minimum required for the Vercel build).

```bash
npm install
```

In PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Edit `.env.local`, generate `NEXTAUTH_SECRET`, and set the seed admin values, then:

```bash
npm run check
npm run seed      # creates/updates only the configured admin by default
npm run dev       # http://localhost:3000
```

Make sure a local MongoDB service is running, or use a MongoDB Atlas URI. The seed script requires the admin name, email, and a non-empty password. It does not create demo users unless `SEED_DEMO_DATA=true`; when enabled, it seeds 10 sample students and requires a non-empty `SEED_STUDENT_PASSWORD`. Sample roll numbers follow the `b` + branch digit + admission year + roll number format. App password fields require a value but do not enforce a minimum length. Simple passwords are convenient for local testing but should not be used for production accounts. Do not enable demo data for production.

## GitHub and Vercel deployment

1. Create a GitHub repository, then initialize and push this project from its folder. Review `git status` first and confirm no `.env*` secrets are staged; `.env.local` is ignored.
2. In MongoDB Atlas, create a production database user and allow the Vercel deployment to connect. Use a separate database from local development.
3. Import the GitHub repository into Vercel and set `MONGODB_URI`, `NEXTAUTH_URL`, and a newly generated `NEXTAUTH_SECRET` in the Vercel project settings. Set the production `NEXTAUTH_URL` to the final HTTPS domain.
4. Create the production admin with a trusted, one-time `npm run seed` run against the production database, using production `SEED_ADMIN_*` values and `SEED_DEMO_DATA=false`. Do not put these seed credentials in GitHub or Vercel unless you have a deliberate operational need.
5. Deploy, then verify sign-in and the admin/student pages. If the Vercel domain changes, update `NEXTAUTH_URL` and redeploy.

The original env template included non-generic identity/credential-like values. If those values were ever used for a real deployment, rotate the affected account password and auth secret before publishing the repository.

## Routes

| Path                              | Who     | What                                   |
| --------------------------------- | ------- | -------------------------------------- |
| `/login`                          | all     | Single login page, role-based redirect |
| `/admin/dashboard`                | admin   | Attendance tracker (default)           |
| `/admin/dashboard/students`       | admin   | Student CRUD                           |
| `/admin/dashboard/menu`           | admin   | Weekly menu editor                     |
| `/admin/dashboard/reports`        | admin   | Monthly report + CSV export            |
| `/admin/dashboard/settings`       | admin   | Notices and mess-closed dates          |
| `/student/dashboard`              | student | Today's meal cards, notices, weekly menu |
| `/student/dashboard/attendance`   | student | Calendar of Present/Absent per meal    |
| `/student/dashboard/profile`      | student | Details + change password              |

`proxy.js` blocks students from `/admin/*` and vice versa; every API route also checks the role server-side.

Meal labels and service windows are configured in `src/lib/meals.js` (Morning 07:00-10:00, Afternoon 12:00-15:00, Night 19:30-22:30; each window is three hours, Asia/Kolkata). Attendance can be edited only for today and the previous two days. Students can be deactivated instead of deleted; inactive students are excluded from attendance and reports.

## API

| Method & path                 | Role    | Purpose                                              |
| ----------------------------- | ------- | ---------------------------------------------------- |
| `GET/POST /api/students`      | admin   | Search (`?q=&page=`; 20 per page) / register         |
| `PUT/DELETE /api/students/:id`| admin   | Update / remove (also deletes attendance)            |
| `GET /api/attendance`         | admin   | `?date&q&page=` three-meal status and present counts |
| `POST /api/attendance`        | admin   | Upsert one student's meal status                     |
| `POST /api/attendance/bulk`   | admin   | Upsert a meal status for filtered students           |
| `GET /api/attendance/today`   | student | Today's menu, meal windows, and own statuses         |
| `GET /api/attendance/me`      | student | `?month=YYYY-MM` own records                         |
| `GET/PUT /api/menu`           | any / admin | Read / save weekly menu                          |
| `GET /api/reports`            | admin   | `?month&q` per-student Present/Absent counts         |
| `GET/POST /api/notices`       | any / admin | Latest notices / post a notice                    |
| `DELETE /api/notices/:id`     | admin   | Delete a notice                                      |
| `GET/POST/DELETE /api/holidays` | any / admin | List closures / add or remove a closed date       |
| `GET /api/me`, `PUT /api/me/password` | any | Profile / change password                        |

## Design notes

- **Default is Absent.** No attendance document means Absent; one is created (upsert) only when the admin toggles a student. The compound unique index `{studentId, date, mealType}` guarantees no duplicates.
- Each attendance mark records the marking admin and timestamp. Closed dates are excluded from absent totals and shown as closed on the student calendar.
- **Dates** are stored as midnight UTC of the calendar day (`toDayDate` in `src/lib/utils.js`).
- **Reports:** Absent = open days elapsed in the month minus Present days.
- **Search** is debounced (350 ms) and stale responses are ignored.
- Student and attendance lists are paginated at 20 rows per page.
