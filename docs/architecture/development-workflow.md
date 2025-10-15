# Development Workflow

[← Back to Index](index.md)

---

## Development Roadmap (Appendix C)

The implementation will follow a phased approach to ensure incremental progress and early validation.

### Phase 1: Foundation & Database Setup ✅ COMPLETE

**Objectives:**
* Set up project structure
* Configure Supabase
* Implement database schema
* Set up authentication

**Tasks:**
1. ✅ Initialize React + Vite project with TypeScript
2. ✅ Configure Tailwind CSS and shadcn/ui
3. ✅ Create Supabase project (`iapzzmgrnydjwzrpxgnv.supabase.co`)
4. ✅ Run database migration (`20241219_initial_bi_dashboard_schema.sql`)
5. ✅ Set up Supabase client in React app
6. ✅ Implement authentication flow (sign up, sign in, sign out)
7. ✅ Create `AuthContext` for managing auth state
8. ✅ Build authentication UI components
9. ✅ Test RLS policies

**Deliverables:**
* Working authentication system
* Database schema deployed
* Basic project structure

**Duration:** 2-3 days

---

### Phase 2: Dashboard Management (Admin) ✅ COMPLETE

**Objectives:**
* Enable admins to create and manage dashboards
* Implement permission assignment
* Build admin interface

**Tasks:**
1. ✅ Create admin dashboard page
2. ✅ Build dashboard CRUD components
3. ✅ Implement permission management UI
4. ✅ Create dashboard list view
5. ✅ Add role-based navigation
6. ✅ Test admin workflows

**Deliverables:**
* Admin can create, update, delete dashboards
* Admin can assign permissions to users
* Working admin interface

**Duration:** 3-4 days

---

### Phase 3: Dashboard Viewer (User) ✅ COMPLETE

**Objectives:**
* Enable users to view their assigned dashboards
* Implement iframe embedding
* Build user dashboard portal

**Tasks:**
1. ✅ Create user dashboard portal page
2. ✅ Fetch user's assigned dashboards
3. ✅ Implement iframe embedding for BI tools
4. ✅ Add dashboard selection/switching
5. ✅ Handle iframe security (sandbox, CSP)
6. ✅ Test with sample Looker/Power BI/Metabase dashboards

**Deliverables:**
* Users can view assigned dashboards
* Secure iframe rendering
* Dashboard switching functionality

**Duration:** 2-3 days

---

### Phase 4: Xero Integration (OAuth + ETL) ✅ COMPLETE

**Objectives:**
* Implement Xero OAuth flow
* Build connection wizard
* Deploy Edge Functions
* Set up ETL pipeline

**Tasks:**
1. ✅ Create Xero OAuth app and get credentials
2. ✅ Build `XeroConnectionWizard` component
3. ✅ Implement `useXeroConnection` hook
4. ✅ Deploy `xero-oauth-callback` Edge Function
5. ✅ Deploy `xero-refresh-token` Edge Function
6. ✅ Deploy `xero-etl-extract` Edge Function
7. ✅ Set up token encryption functions in database
8. ✅ Configure `pg_cron` for scheduled ETL
9. ✅ Test OAuth flow end-to-end
10. ✅ Verify data extraction and caching

**Deliverables:**
* Working Xero OAuth integration
* Automated daily data sync
* Encrypted token storage

**Duration:** 4-5 days

---

### Phase 5: Testing, Documentation & Deployment 🔄 IN PROGRESS

**Objectives:**
* Comprehensive testing
* Complete documentation
* Deploy to production

**Tasks:**
1. ✅ Write unit tests for components
2. ✅ Write integration tests for API calls
3. ✅ Write E2E tests for critical flows
4. ✅ Complete API documentation
5. 🔄 Complete architecture documentation (sharding in progress)
6. ⏳ Create user guide/README
7. ⏳ Deploy to Vercel/Netlify
8. ⏳ Configure production environment variables
9. ⏳ Set up monitoring and logging
10. ⏳ Conduct security audit

**Deliverables:**
* Production-ready application
* Complete documentation
* Deployed and monitored system

**Duration:** 3-4 days

---

## Development Best Practices

### Code Quality

* **Linting:** Use ESLint with strict rules
* **Formatting:** Use Prettier for consistent code style
* **Type Safety:** Leverage TypeScript's strict mode
* **Code Reviews:** All changes require review before merging

### Version Control

* **Branching Strategy:** Use feature branches (`feature/dashboard-management`)
* **Commit Messages:** Follow conventional commits (e.g., `feat:`, `fix:`, `docs:`)
* **Pull Requests:** Include description, testing notes, and screenshots

### Documentation

* **Code Comments:** Document complex logic and business rules
* **API Documentation:** Keep Edge Function docs up to date
* **README:** Maintain comprehensive setup instructions
* **Architecture Docs:** Keep architecture diagrams current

### Environment Management

* **Local Development:** Use `.env.local` for local configuration
* **Staging:** Use Supabase branching for staging environment
* **Production:** Use Supabase production project with strict access controls

### Deployment Process

1. **Development:**
   * Work on feature branch
   * Test locally
   * Create pull request

2. **Staging:**
   * Deploy to staging environment
   * Run full test suite
   * Manual QA testing

3. **Production:**
   * Merge to main branch
   * Automatic deployment via Vercel/Netlify
   * Monitor logs and metrics
   * Rollback if issues detected

### Monitoring & Maintenance

* **Error Tracking:** Set up Sentry or similar service
* **Performance Monitoring:** Use Vercel Analytics or similar
* **Database Monitoring:** Monitor Supabase dashboard for slow queries
* **Uptime Monitoring:** Set up alerts for downtime
* **Regular Updates:** Keep dependencies updated monthly

### Security Maintenance

* **Dependency Audits:** Run `npm audit` weekly
* **Access Reviews:** Review user roles and permissions quarterly
* **Token Rotation:** Rotate API keys and secrets annually
* **Backup Strategy:** Ensure database backups are running
* **Incident Response:** Have a plan for security incidents
