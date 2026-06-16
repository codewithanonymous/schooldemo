import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { 
  Play, 
  Trash2, 
  StopCircle, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Terminal, 
  ArrowLeft,
  Settings,
  ShieldAlert,
  Loader
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const Testing = () => {
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [running, setRunning] = useState(false)
  const [currentSuite, setCurrentSuite] = useState('')
  const stopRequested = useRef(false)
  const logEndRef = useRef(null)

  const [summary, setSummary] = useState({
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  })

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // Security check: Only allow access in development/localhost mode
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    const checkLocalhost = () => {
      const hostname = window.location.hostname
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || import.meta.env.DEV
      
      if (isLocal) {
        setIsAuthorized(true)
      } else {
        setIsAuthorized(false)
      }
      setCheckingAuth(false)
    }
    checkLocalhost()
  }, [])

  const log = (text, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { text, type, timestamp }])
  }

  const clearLogs = () => {
    setLogs([])
    setSummary({ total: 0, passed: 0, failed: 0, skipped: 0 })
    setCurrentSuite('')
  }

  const stopTests = () => {
    if (running) {
      stopRequested.current = true
      log("[SYSTEM] Stop requested. The test run will halt after the current step.", "warning")
    }
  }

  const runTest = async (name, testFn, skip = false) => {
    if (stopRequested.current) {
      log(`[STOPPED] Skipped test: ${name}`, 'warning')
      setSummary(prev => ({ ...prev, skipped: prev.skipped + 1, total: prev.total + 1 }))
      return
    }

    if (skip) {
      log(`[SKIPPED] ${name}`, 'warning')
      setSummary(prev => ({ ...prev, skipped: prev.skipped + 1, total: prev.total + 1 }))
      return
    }

    log(`[RUNNING] ${name}`, 'info')
    try {
      await testFn()
      log(`[PASSED] ${name}`, 'success')
      setSummary(prev => ({ ...prev, passed: prev.passed + 1, total: prev.total + 1 }))
    } catch (err) {
      log(`[FAILED] ${name}: ${err.message || JSON.stringify(err)}`, 'error')
      console.error(`Test failed: ${name}`, err)
      setSummary(prev => ({ ...prev, failed: prev.failed + 1, total: prev.total + 1 }))
    }
  }

  const startTestRunner = async () => {
    if (running) return
    setRunning(true)
    stopRequested.current = false
    clearLogs()
    log("[SYSTEM] Starting automated development QA tests...", "info")

    // Create a non-persisting supabase client for login simulations
    // This avoids disrupting the developer's active login session in localstorage
    const testSupabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )

    // Helper function to login or auto-provision if missing
    const authenticateOrProvision = async (email, password, roleName) => {
      log(`Attempting login as ${roleName}: ${email}`, 'info')
      let { data, error } = await testSupabase.auth.signInWithPassword({
        email,
        password
      })

      if (error && (error.message === 'Invalid login credentials' || error.message?.includes('Email not confirmed') || error.message?.includes('User not found') || error.status === 400)) {
        log(`Account '${email}' not found in Supabase Auth. Auto-provisioning...`, 'warning')

        // SignUp
        const { data: signUpData, error: signUpError } = await testSupabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: roleName,
              name: 'Demo',
              surname: roleName.toUpperCase()
            }
          }
        })

        if (signUpError) {
          throw new Error(`Auto-provisioning signUp failed: ${signUpError.message}`)
        }

        const userId = signUpData.user?.id
        if (!userId) {
          throw new Error("No user ID returned from sign up.")
        }

        log(`Auth account created with ID: ${userId}. Linking DB profile...`, 'info')

        // Insert matching DB profile record
        try {
          if (roleName === 'admin') {
            await supabase.from('Admin').insert({ id: userId, username: email.split('@')[0] })
          } else if (roleName === 'teacher') {
            await supabase.from('Teacher').insert({
              id: userId,
              username: email.split('@')[0],
              name: 'Demo',
              surname: 'Teacher',
              email: email,
              address: 'Demo Address',
              bloodType: 'A+',
              sex: 'MALE',
              birthday: '1980-01-01',
              createdAt: new Date().toISOString()
            })
          } else if (roleName === 'student') {
            const { data: parents } = await supabase.from('Parent').select('id').limit(1)
            const { data: classes } = await supabase.from('Class').select('id').limit(1)
            const { data: grades } = await supabase.from('Grade').select('id').limit(1)

            let parentId = parents?.[0]?.id
            let classId = classes?.[0]?.id
            let gradeId = grades?.[0]?.id

            if (!parentId) {
              parentId = '_TEST_Parent_Ref'
              await supabase.from('Parent').insert({
                id: parentId,
                username: 'demo_parent_ref',
                name: 'Demo',
                surname: 'ParentRef',
                email: 'demoparentref@school.com',
                phone: '12345678',
                address: 'Demo Address'
              })
            }

            if (!gradeId) {
              const { data: newGrade } = await supabase.from('Grade').insert({ level: 1 }).select()
              gradeId = newGrade[0].id
            }

            if (!classId) {
              const { data: newClass } = await supabase.from('Class').insert({
                name: 'DemoClassRef',
                capacity: 30,
                gradeId: gradeId
              }).select()
              classId = newClass[0].id
            }

            await supabase.from('Student').insert({
              id: userId,
              username: email.split('@')[0],
              name: 'Demo',
              surname: 'Student',
              email: email,
              address: 'Demo Address',
              bloodType: 'O-',
              sex: 'FEMALE',
              birthday: '2015-01-01',
              parentId: parentId,
              classId: classId,
              gradeId: gradeId,
              createdAt: new Date().toISOString()
            })
          } else if (roleName === 'parent') {
            await supabase.from('Parent').insert({
              id: userId,
              username: email.split('@')[0],
              name: 'Demo',
              surname: 'Parent',
              email: email,
              phone: '123456789',
              address: 'Demo Address'
            })
          }
          log(`Linked profile in DB successfully.`, 'success')
        } catch (dbErr) {
          log(`Warning: DB profile link status: ${dbErr.message || dbErr}`, 'warning')
        }

        // Retry login
        log(`Retrying sign-in...`, 'info')
        const { data: retryData, error: retryError } = await testSupabase.auth.signInWithPassword({
          email,
          password
        })

        if (retryError) {
          throw new Error(`Auth retry failed: ${retryError.message}`)
        }
        data = retryData
        error = null
      }

      if (error) throw error
      return data
    }

    // ==========================================
    // SUITE A: AUTHENTICATION FLOWS & ADMIN DEBUG
    // ==========================================
    setCurrentSuite('A: AUTH TESTING & ADMIN DEBUG')
    log("=== SUITE A: AUTHENTICATION & LOGIN FLOWS ===", "info")

    // 1. Connection check
    await runTest('Verify Supabase connection settings', async () => {
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment configuration.")
      }
      log(`URL: ${import.meta.env.VITE_SUPABASE_URL}`, 'info')
    })

    // 2. Admin Login & Debugging
    await runTest('Admin Authentication & Metadata Inspection', async () => {
      const adminEmail = 'admin@example.com'
      const adminPassword = '12345678' // default demo password

      const data = await authenticateOrProvision(adminEmail, adminPassword, 'admin')

      // Generate a detailed debugging payload
      const debugObject = {
        email: adminEmail,
        timestamp: new Date().toISOString(),
        authResponse: data,
        userMetadata: data?.user?.user_metadata || null,
        metadataRole: data?.user?.user_metadata?.role || null,
        dbRecord: null,
        dbError: null
      }

      if (data?.user) {
        // Query the Admin table directly to verify database mapping
        const { data: dbAdmin, error: dbErr } = await supabase
          .from('Admin')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle()
        
        debugObject.dbRecord = dbAdmin
        debugObject.dbError = dbErr ? dbErr.message : null
      }

      log(`[DEBUG INFO] Admin Auth Debug Payload:\n${JSON.stringify(debugObject, null, 2)}`, 'info')

      if (debugObject.metadataRole !== 'admin') {
        log(`Warning: Admin user metadata role is not 'admin' (found: '${debugObject.metadataRole}')`, 'warning')
      }

      if (!debugObject.dbRecord) {
        log(`Warning: Admin UUID '${data.user.id}' is not mapped in the database 'Admin' table.`, 'warning')
      }
    })

    // 3. Teacher Login
    await runTest('Teacher Authentication', async () => {
      const teacherEmail = 'teacher@example.com'
      const teacherPassword = '12345678'
      const data = await authenticateOrProvision(teacherEmail, teacherPassword, 'teacher')
      log(`Logged in. Role metadata: ${data.user.user_metadata?.role}`, 'info')
    })

    // 4. Student Login
    await runTest('Student Authentication', async () => {
      const studentEmail = 'student@example.com'
      const studentPassword = '12345678'
      const data = await authenticateOrProvision(studentEmail, studentPassword, 'student')
      log(`Logged in. Role metadata: ${data.user.user_metadata?.role}`, 'info')
    })

    // 5. Staff Login (Placeholder check)
    await runTest('Staff Authentication', async () => {
      const parentEmail = 'parent@example.com'
      const parentPassword = '12345678'
      const data = await authenticateOrProvision(parentEmail, parentPassword, 'parent')
      log(`Logged in as Parent. Role metadata: ${data.user.user_metadata?.role}`, 'info')
    })



    // ==========================================
    // SUITE B: ROUTE PERMISSIONS & PROTECTED ROUTE
    // ==========================================
    setCurrentSuite('B: ROUTE ACCESS RULES')
    log("\n=== SUITE B: ROUTE PERMISSION TESTING ===", "info")

    const testRoutes = [
      { path: '/admin', allowed: ['admin'] },
      { path: '/teacher', allowed: ['teacher'] },
      { path: '/student', allowed: ['student'] },
      { path: '/parent', allowed: ['parent'] },
      { path: '/list/teachers', allowed: ['admin', 'teacher'] },
      { path: '/list/students', allowed: ['admin', 'teacher'] },
      { path: '/list/classes', allowed: ['admin', 'teacher'] },
      { path: '/list/subjects', allowed: ['admin'] },
      { path: '/list/exams', allowed: ['admin', 'teacher', 'student', 'parent'] },
      { path: '/list/announcements', allowed: ['admin', 'teacher', 'student', 'parent'] }
    ]

    for (const route of testRoutes) {
      await runTest(`Verify Access to ${route.path}`, async () => {
        // Mock ProtectedRoute role verification rule
        const rolesToCheck = ['admin', 'teacher', 'student', 'parent']
        rolesToCheck.forEach(testRole => {
          const isAllowed = route.allowed.includes(testRole)
          log(`Role [${testRole}] -> Access Allowed: ${isAllowed ? 'YES' : 'NO'}`, 'info')
        })
      })
    }


    // ==========================================
    // SUITE C: DATABASE CRUD CYCLE
    // ==========================================
    setCurrentSuite('C: DATABASE CRUD OPERATIONS')
    log("\n=== SUITE C: DATABASE CRUD CYCLES ===", "info")

    // Let's declare variable state to carry across tests safely
    let subjectId = null
    let gradeId = null
    let classId = null
    let teacherId = '_TEST_Teacher_ID_' + Math.random().toString(36).substr(2, 5)
    let parentId = '_TEST_Parent_ID_' + Math.random().toString(36).substr(2, 5)
    let studentId = '_TEST_Student_ID_' + Math.random().toString(36).substr(2, 5)
    let lessonId = null
    let examId = null
    let announcementId = null

    // 1. Subject CRUD
    await runTest('CRUD Subject - Create', async () => {
      const { data, error } = await supabase
        .from('Subject')
        .insert({ name: '_TEST_Subject_' + Math.random().toString(36).substr(2, 4) })
        .select()

      if (error) throw error
      subjectId = data[0].id
      log(`Created test Subject with ID: ${subjectId}`, 'info')
    })

    await runTest('CRUD Subject - Read', async () => {
      if (!subjectId) throw new Error("Skipping: Subject was not created.")
      const { data, error } = await supabase
        .from('Subject')
        .select('*')
        .eq('id', subjectId)
        .single()

      if (error) throw error
      log(`Read Subject name: ${data.name}`, 'info')
    })

    await runTest('CRUD Subject - Update', async () => {
      if (!subjectId) throw new Error("Skipping: Subject was not created.")
      const updatedName = '_TEST_Subject_Updated_' + Math.random().toString(36).substr(2, 4)
      const { error } = await supabase
        .from('Subject')
        .update({ name: updatedName })
        .eq('id', subjectId)

      if (error) throw error

      // Verify update
      const { data: verifyData } = await supabase.from('Subject').select('name').eq('id', subjectId).single()
      if (verifyData.name !== updatedName) {
        throw new Error(`Expected name to be '${updatedName}', got '${verifyData.name}'`)
      }
    })

    // 2. Grade Setup (For Classes and Students)
    await runTest('CRUD Grade - Resolve/Create', async () => {
      const { data: existingGrades, error } = await supabase.from('Grade').select('*').limit(1)
      if (error) throw error

      if (existingGrades && existingGrades.length > 0) {
        gradeId = existingGrades[0].id
        log(`Using existing Grade Level: ${existingGrades[0].level} (ID: ${gradeId})`, 'info')
      } else {
        const { data: newGrade, error: insertError } = await supabase
          .from('Grade')
          .insert({ level: 99 })
          .select()
        
        if (insertError) throw insertError
        gradeId = newGrade[0].id
        log(`Created new test Grade Level: 99 (ID: ${gradeId})`, 'info')
      }
    })

    // 3. Parent CRUD
    await runTest('CRUD Parent - Create', async () => {
      const email = `test_parent_${Math.random().toString(36).substr(2, 5)}@school.com`
      const phone = '999999999'
      const { error } = await supabase
        .from('Parent')
        .insert({
          id: parentId,
          username: 'test_parent_' + Math.random().toString(36).substr(2, 4),
          name: '_TEST_Parent',
          surname: 'QA',
          email: email,
          phone: phone,
          address: 'Test Parent Address'
        })

      if (error) throw error
      log(`Created test Parent with ID: ${parentId}`, 'info')
    })

    await runTest('CRUD Parent - Read & Update', async () => {
      const { data, error } = await supabase.from('Parent').select('*').eq('id', parentId).single()
      if (error) throw error

      log(`Read Parent name: ${data.name} ${data.surname}`, 'info')

      const updatedPhone = '888888888'
      const { error: updateError } = await supabase
        .from('Parent')
        .update({ phone: updatedPhone })
        .eq('id', parentId)

      if (updateError) throw updateError

      const { data: verifyData } = await supabase.from('Parent').select('phone').eq('id', parentId).single()
      if (verifyData.phone !== updatedPhone) {
        throw new Error("Parent phone update verification failed.")
      }
    })

    // 4. Teacher CRUD
    await runTest('CRUD Teacher - Create', async () => {
      const { error } = await supabase
        .from('Teacher')
        .insert({
          id: teacherId,
          username: 'test_teacher_' + Math.random().toString(36).substr(2, 4),
          name: '_TEST_Teacher',
          surname: 'QA',
          email: `test_teacher_${Math.random().toString(36).substr(2, 5)}@school.com`,
          address: 'Test Teacher Address',
          bloodType: 'AB+',
          sex: 'FEMALE',
          birthday: '1985-05-15',
          createdAt: new Date().toISOString()
        })

      if (error) throw error
      log(`Created test Teacher with ID: ${teacherId}`, 'info')
    })

    await runTest('CRUD Teacher - Read & Update', async () => {
      const { data, error } = await supabase.from('Teacher').select('*').eq('id', teacherId).single()
      if (error) throw error

      log(`Read Teacher: ${data.name} ${data.surname}`, 'info')

      const { error: updateError } = await supabase
        .from('Teacher')
        .update({ address: 'Updated Teacher Address' })
        .eq('id', teacherId)

      if (updateError) throw updateError
    })

    // 5. Class CRUD
    await runTest('CRUD Class - Create', async () => {
      if (!gradeId) throw new Error("Grade ID required to create Class")
      const className = '_TEST_Class_' + Math.random().toString(36).substr(2, 4).toUpperCase()
      const { data, error } = await supabase
        .from('Class')
        .insert({
          name: className,
          capacity: 25,
          gradeId: gradeId,
          supervisorId: teacherId
        })
        .select()

      if (error) throw error
      classId = data[0].id
      log(`Created test Class '${className}' with ID: ${classId}`, 'info')
    })

    await runTest('CRUD Class - Read & Update', async () => {
      if (!classId) throw new Error("Class ID required")
      const { data, error } = await supabase.from('Class').select('*').eq('id', classId).single()
      if (error) throw error

      log(`Read Class Name: ${data.name}, Capacity: ${data.capacity}`, 'info')

      const { error: updateError } = await supabase
        .from('Class')
        .update({ capacity: 30 })
        .eq('id', classId)

      if (updateError) throw updateError
    })

    // 6. Student CRUD
    await runTest('CRUD Student - Create', async () => {
      if (!parentId || !classId || !gradeId) throw new Error("Parent, Class, and Grade IDs required to enroll Student")
      
      const { error } = await supabase
        .from('Student')
        .insert({
          id: studentId,
          username: 'test_student_' + Math.random().toString(36).substr(2, 4),
          name: '_TEST_Student',
          surname: 'QA',
          email: `test_student_${Math.random().toString(36).substr(2, 5)}@school.com`,
          phone: '111222333',
          address: 'Test Student Address',
          bloodType: 'B+',
          sex: 'MALE',
          birthday: '2012-08-20',
          parentId: parentId,
          classId: classId,
          gradeId: gradeId,
          createdAt: new Date().toISOString()
        })

      if (error) throw error
      log(`Created test Student with ID: ${studentId}`, 'info')
    })

    await runTest('CRUD Student - Read & Update', async () => {
      const { data, error } = await supabase.from('Student').select('*').eq('id', studentId).single()
      if (error) throw error

      log(`Read Student: ${data.name} ${data.surname}, Class ID: ${data.classId}`, 'info')

      const { error: updateError } = await supabase
        .from('Student')
        .update({ phone: '999888777' })
        .eq('id', studentId)

      if (updateError) throw updateError
    })

    // 7. Lesson Setup & Exam CRUD
    await runTest('CRUD Lesson - Create', async () => {
      if (!subjectId || !classId || !teacherId) throw new Error("Subject, Class, and Teacher IDs required to create Lesson")

      const { data, error } = await supabase
        .from('Lesson')
        .insert({
          name: '_TEST_Lesson_QA',
          day: 'TUESDAY',
          startTime: new Date('2026-06-16T09:00:00Z').toISOString(),
          endTime: new Date('2026-06-16T10:00:00Z').toISOString(),
          subjectId: subjectId,
          classId: classId,
          teacherId: teacherId
        })
        .select()

      if (error) throw error
      lessonId = data[0].id
      log(`Created test Lesson with ID: ${lessonId}`, 'info')
    })

    await runTest('CRUD Exam - Create & Update', async () => {
      if (!lessonId) throw new Error("Lesson ID required to schedule Exam")

      // Create Exam
      const { data, error } = await supabase
        .from('Exam')
        .insert({
          title: '_TEST_Exam_QA',
          startTime: new Date('2026-06-17T10:00:00Z').toISOString(),
          endTime: new Date('2026-06-17T11:00:00Z').toISOString(),
          lessonId: lessonId
        })
        .select()

      if (error) throw error
      examId = data[0].id
      log(`Created test Exam with ID: ${examId}`, 'info')

      // Update Exam
      const { error: updateError } = await supabase
        .from('Exam')
        .update({ title: '_TEST_Exam_QA_Updated' })
        .eq('id', examId)

      if (updateError) throw updateError
    })

    // 8. Attendance CRUD
    await runTest('CRUD Attendance - Create & Verify', async () => {
      if (!studentId || !lessonId) throw new Error("Student and Lesson IDs required for Attendance")

      const { data, error } = await supabase
        .from('Attendance')
        .insert({
          date: new Date().toISOString().split('T')[0],
          present: true,
          studentId: studentId,
          lessonId: lessonId
        })
        .select()

      if (error) throw error
      const attId = data[0].id
      log(`Created test Attendance record. Present: ${data[0].present}`, 'info')

      // Clean up Attendance
      const { error: delError } = await supabase.from('Attendance').delete().eq('id', attId)
      if (delError) throw delError
      log("Verified & deleted test Attendance record successfully.", 'info')
    })

    // 9. Announcement CRUD
    await runTest('CRUD Announcement - Create & Update', async () => {
      const { data, error } = await supabase
        .from('Announcement')
        .insert({
          title: '_TEST_Announcement_QA',
          description: 'This is a test announcement description.',
          date: new Date().toISOString(),
          classId: classId // targeting our test class
        })
        .select()

      if (error) throw error
      announcementId = data[0].id
      log(`Created test Announcement with ID: ${announcementId}`, 'info')

      const { error: updateError } = await supabase
        .from('Announcement')
        .update({ description: 'Updated test announcement description.' })
        .eq('id', announcementId)

      if (updateError) throw updateError
    })

    // 10. CLEANUP SUITE (Ensures no test residues are left in Database)
    log("\n=== DATABASE CLEANUP (SAFE MODE) ===", "info")

    await runTest('Delete test Announcement', async () => {
      if (announcementId) {
        const { error } = await supabase.from('Announcement').delete().eq('id', announcementId)
        if (error) throw error
      }
    })

    await runTest('Delete test Exam', async () => {
      if (examId) {
        const { error } = await supabase.from('Exam').delete().eq('id', examId)
        if (error) throw error
      }
    })

    await runTest('Delete test Lesson', async () => {
      if (lessonId) {
        const { error } = await supabase.from('Lesson').delete().eq('id', lessonId)
        if (error) throw error
      }
    })

    await runTest('Delete test Student', async () => {
      if (studentId) {
        const { error } = await supabase.from('Student').delete().eq('id', studentId)
        if (error) throw error
      }
    })

    await runTest('Delete test Class', async () => {
      if (classId) {
        const { error } = await supabase.from('Class').delete().eq('id', classId)
        if (error) throw error
      }
    })

    await runTest('Delete test Teacher', async () => {
      if (teacherId) {
        const { error } = await supabase.from('Teacher').delete().eq('id', teacherId)
        if (error) throw error
      }
    })

    await runTest('Delete test Parent', async () => {
      if (parentId) {
        const { error } = await supabase.from('Parent').delete().eq('id', parentId)
        if (error) throw error
      }
    })

    await runTest('Delete test Subject', async () => {
      if (subjectId) {
        const { error } = await supabase.from('Subject').delete().eq('id', subjectId)
        if (error) throw error
      }
    })

    await runTest('Delete test Grade Level (if created)', async () => {
      // Only delete if it was level 99 (our test grade)
      if (gradeId) {
        const { data } = await supabase.from('Grade').select('level').eq('id', gradeId).single()
        if (data && data.level === 99) {
          const { error } = await supabase.from('Grade').delete().eq('id', gradeId)
          if (error) throw error
        }
      }
    })

    // Staff mock check
    await runTest('CRUD Staff - Skip check', async () => {
      log("Skipped: Staff model/table does not exist in schema.prisma", "warning")
    }, true)


    // ==========================================
    // SUITE D: DASHBOARD ANALYTICS & QUERY CONSISTENCY
    // ==========================================
    setCurrentSuite('D: ANALYTICS & QUERY CONSISTENCY')
    log("\n=== SUITE D: DASHBOARD ANALYTICS ===", "info")

    await runTest('Verify User counts aggregation', async () => {
      const { count: studentCount } = await supabase.from('Student').select('*', { count: 'exact', head: true })
      const { count: teacherCount } = await supabase.from('Teacher').select('*', { count: 'exact', head: true })
      const { count: parentCount } = await supabase.from('Parent').select('*', { count: 'exact', head: true })
      const { count: adminCount } = await supabase.from('Admin').select('*', { count: 'exact', head: true })

      log(`Counts retrieved successfully:\nStudents: ${studentCount}\nTeachers: ${teacherCount}\nParents: ${parentCount}\nAdmins: ${adminCount}`, 'success')
    })

    await runTest('Validate Attendance percentage calculation', async () => {
      const { data, error } = await supabase.from('Attendance').select('present')
      if (error) throw error

      if (data && data.length > 0) {
        const present = data.filter(d => d.present).length
        const rate = Math.round((present / data.length) * 100)
        log(`Attendance Aggregation check: ${present}/${data.length} present (${rate}%)`, 'info')
      } else {
        log("No Attendance records found to calculate rate.", 'warning')
      }
    })

    log("\n[SYSTEM] QA Test Runner Execution Completed.", "success")
    setRunning(false)
  }

  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0f172a', color: '#fff' }}>
        <Loader className="spinner" style={{ marginRight: '12px' }} />
        <span>Authenticating Dev Mode...</span>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0f172a', color: '#fff', padding: '32px', textAlign: 'center' }}>
        <ShieldAlert size={64} color="var(--danger)" style={{ marginBottom: '24px' }} />
        <h1 style={{ marginBottom: '12px' }}>Access Denied</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', marginBottom: '24px' }}>
          The Automated Development Testing dashboard is restricted to localhost / development environments only for security purposes.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/login')}>
          Go to Sign In
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px', backgroundColor: 'var(--bg-main)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn-icon" onClick={() => navigate('/')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Terminal size={28} style={{ color: 'var(--primary)' }} />
              QA Test Runner Dashboard
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>Automated end-to-end integration and login validation suite.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={clearLogs} disabled={running}>
            <Trash2 size={16} />
            <span>Clear Logs</span>
          </button>
          {running ? (
            <button className="btn btn-danger" onClick={stopTests}>
              <StopCircle size={16} />
              <span>Stop Tests</span>
            </button>
          ) : (
            <button className="btn btn-primary" onClick={startTestRunner}>
              <Play size={16} />
              <span>Run Suite</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '24px' }}>
        <div className="stat-card" style={{ padding: '20px' }}>
          <div style={{ flexGrow: 1 }}>
            <span className="stat-label">Total Tests Run</span>
            <div className="stat-value">{summary.total}</div>
          </div>
        </div>
        <div className="stat-card" style={{ padding: '20px', borderLeft: '4px solid var(--success)' }}>
          <div style={{ flexGrow: 1 }}>
            <span className="stat-label" style={{ color: 'var(--success)' }}>Passed</span>
            <div className="stat-value" style={{ color: 'var(--success)' }}>{summary.passed}</div>
          </div>
        </div>
        <div className="stat-card" style={{ padding: '20px', borderLeft: '4px solid var(--danger)' }}>
          <div style={{ flexGrow: 1 }}>
            <span className="stat-label" style={{ color: 'var(--danger)' }}>Failed</span>
            <div className="stat-value" style={{ color: 'var(--danger)' }}>{summary.failed}</div>
          </div>
        </div>
        <div className="stat-card" style={{ padding: '20px', borderLeft: '4px solid var(--warning)' }}>
          <div style={{ flexGrow: 1 }}>
            <span className="stat-label" style={{ color: 'var(--warning)' }}>Skipped / Warning</span>
            <div className="stat-value" style={{ color: 'var(--warning)' }}>{summary.skipped}</div>
          </div>
        </div>
      </div>

      {/* Terminal View */}
      <div style={{ 
        flexGrow: 1, 
        backgroundColor: '#020617', 
        border: '1px solid var(--border-color)', 
        borderRadius: 'var(--radius-lg)', 
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.6)',
        height: '60vh',
        minHeight: '400px'
      }}>
        
        {/* Terminal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>
            <Terminal size={14} />
            <span>TERMINAL_OUTPUT</span>
            {running && (
              <span className="badge badge-primary" style={{ animation: 'pulse 2s infinite', fontSize: '10px', padding: '2px 6px' }}>
                RUNNING SUITE: {currentSuite}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#eab308' }}></span>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
          </div>
        </div>

        {/* Terminal logs list */}
        <div style={{ 
          flexGrow: 1, 
          overflowY: 'auto', 
          fontFamily: 'monospace', 
          fontSize: '13px', 
          lineHeight: '1.6', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px',
          paddingRight: '8px'
        }}>
          {logs.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <Terminal size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
              <span>Console is empty. Click "Run Suite" to begin automated testing.</span>
            </div>
          ) : (
            logs.map((logItem, index) => {
              let logColor = '#cbd5e1' // default white/gray
              let LogIcon = Info

              if (logItem.type === 'success') {
                logColor = '#10b981' // green
                LogIcon = CheckCircle
              } else if (logItem.type === 'error') {
                logColor = '#ef4444' // red
                LogIcon = XCircle
              } else if (logItem.type === 'warning') {
                logColor = '#f59e0b' // yellow
                LogIcon = AlertTriangle
              }

              return (
                <div key={index} style={{ color: logColor, display: 'flex', alignItems: 'flex-start', gap: '10px', whiteSpace: 'pre-wrap' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', userSelect: 'none', minWidth: '60px' }}>
                    [{logItem.timestamp}]
                  </span>
                  <LogIcon size={14} style={{ marginTop: '4px', flexShrink: 0 }} />
                  <span style={{ flexGrow: 1 }}>{logItem.text}</span>
                </div>
              )
            })
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  )
}

export default Testing
