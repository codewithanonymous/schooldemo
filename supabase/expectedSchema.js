export const expectedSchema = {
  tables: {
    Admin: {
      columns: {
        id: { type: 'text', nullable: 'NO', isPrimaryKey: true },
        username: { type: 'text', nullable: 'NO', unique: true }
      }
    },
    Teacher: {
      columns: {
        id: { type: 'text', nullable: 'NO', isPrimaryKey: true },
        username: { type: 'text', nullable: 'NO', unique: true },
        name: { type: 'text', nullable: 'NO' },
        surname: { type: 'text', nullable: 'NO' },
        email: { type: 'text', nullable: 'YES', unique: true },
        phone: { type: 'text', nullable: 'YES', unique: true },
        address: { type: 'text', nullable: 'NO' },
        img: { type: 'text', nullable: 'YES' },
        bloodType: { type: 'text', nullable: 'NO' },
        sex: { type: 'text', nullable: 'NO' },
        birthday: { type: 'timestamp with time zone', nullable: 'NO' },
        createdAt: { type: 'timestamp with time zone', nullable: 'NO', default: 'now()' }
      }
    },
    Student: {
      columns: {
        id: { type: 'text', nullable: 'NO', isPrimaryKey: true },
        username: { type: 'text', nullable: 'NO', unique: true },
        name: { type: 'text', nullable: 'NO' },
        surname: { type: 'text', nullable: 'NO' },
        email: { type: 'text', nullable: 'YES', unique: true },
        phone: { type: 'text', nullable: 'YES', unique: true },
        address: { type: 'text', nullable: 'NO' },
        img: { type: 'text', nullable: 'YES' },
        bloodType: { type: 'text', nullable: 'NO' },
        sex: { type: 'text', nullable: 'NO' },
        birthday: { type: 'timestamp with time zone', nullable: 'NO' },
        parentId: { type: 'text', nullable: 'NO', isForeignKey: true, references: 'Parent.id' },
        classId: { type: 'integer', nullable: 'NO', isForeignKey: true, references: 'Class.id' },
        gradeId: { type: 'integer', nullable: 'NO', isForeignKey: true, references: 'Grade.id' },
        createdAt: { type: 'timestamp with time zone', nullable: 'NO', default: 'now()' }
      }
    },
    Parent: {
      columns: {
        id: { type: 'text', nullable: 'NO', isPrimaryKey: true },
        username: { type: 'text', nullable: 'NO', unique: true },
        name: { type: 'text', nullable: 'NO' },
        surname: { type: 'text', nullable: 'NO' },
        email: { type: 'text', nullable: 'YES', unique: true },
        phone: { type: 'text', nullable: 'NO', unique: true },
        address: { type: 'text', nullable: 'NO' },
        createdAt: { type: 'timestamp with time zone', nullable: 'NO', default: 'now()' }
      }
    },
    Grade: {
      columns: {
        id: { type: 'integer', nullable: 'NO', isPrimaryKey: true },
        level: { type: 'integer', nullable: 'NO', unique: true }
      }
    },
    Class: {
      columns: {
        id: { type: 'integer', nullable: 'NO', isPrimaryKey: true },
        name: { type: 'text', nullable: 'NO', unique: true },
        capacity: { type: 'integer', nullable: 'NO' },
        supervisorId: { type: 'text', nullable: 'YES', isForeignKey: true, references: 'Teacher.id' },
        gradeId: { type: 'integer', nullable: 'NO', isForeignKey: true, references: 'Grade.id' }
      }
    },
    Subject: {
      columns: {
        id: { type: 'integer', nullable: 'NO', isPrimaryKey: true },
        name: { type: 'text', nullable: 'NO', unique: true }
      }
    },
    Lesson: {
      columns: {
        id: { type: 'integer', nullable: 'NO', isPrimaryKey: true },
        name: { type: 'text', nullable: 'NO' },
        day: { type: 'text', nullable: 'NO' },
        startTime: { type: 'timestamp with time zone', nullable: 'NO' },
        endTime: { type: 'timestamp with time zone', nullable: 'NO' },
        subjectId: { type: 'integer', nullable: 'NO', isForeignKey: true, references: 'Subject.id' },
        classId: { type: 'integer', nullable: 'NO', isForeignKey: true, references: 'Class.id' },
        teacherId: { type: 'text', nullable: 'NO', isForeignKey: true, references: 'Teacher.id' }
      }
    },
    Exam: {
      columns: {
        id: { type: 'integer', nullable: 'NO', isPrimaryKey: true },
        title: { type: 'text', nullable: 'NO' },
        startTime: { type: 'timestamp with time zone', nullable: 'NO' },
        endTime: { type: 'timestamp with time zone', nullable: 'NO' },
        lessonId: { type: 'integer', nullable: 'NO', isForeignKey: true, references: 'Lesson.id' }
      }
    },
    Assignment: {
      columns: {
        id: { type: 'integer', nullable: 'NO', isPrimaryKey: true },
        title: { type: 'text', nullable: 'NO' },
        startDate: { type: 'timestamp with time zone', nullable: 'NO' },
        dueDate: { type: 'timestamp with time zone', nullable: 'NO' },
        lessonId: { type: 'integer', nullable: 'NO', isForeignKey: true, references: 'Lesson.id' }
      }
    },
    Result: {
      columns: {
        id: { type: 'integer', nullable: 'NO', isPrimaryKey: true },
        score: { type: 'integer', nullable: 'NO' },
        examId: { type: 'integer', nullable: 'YES', isForeignKey: true, references: 'Exam.id' },
        assignmentId: { type: 'integer', nullable: 'YES', isForeignKey: true, references: 'Assignment.id' },
        studentId: { type: 'text', nullable: 'NO', isForeignKey: true, references: 'Student.id' }
      }
    },
    Attendance: {
      columns: {
        id: { type: 'integer', nullable: 'NO', isPrimaryKey: true },
        date: { type: 'timestamp with time zone', nullable: 'NO' },
        present: { type: 'boolean', nullable: 'NO' },
        studentId: { type: 'text', nullable: 'NO', isForeignKey: true, references: 'Student.id' },
        lessonId: { type: 'integer', nullable: 'NO', isForeignKey: true, references: 'Lesson.id' }
      }
    },
    Event: {
      columns: {
        id: { type: 'integer', nullable: 'NO', isPrimaryKey: true },
        title: { type: 'text', nullable: 'NO' },
        description: { type: 'text', nullable: 'NO' },
        startTime: { type: 'timestamp with time zone', nullable: 'NO' },
        endTime: { type: 'timestamp with time zone', nullable: 'NO' },
        classId: { type: 'integer', nullable: 'YES', isForeignKey: true, references: 'Class.id' }
      }
    },
    Announcement: {
      columns: {
        id: { type: 'integer', nullable: 'NO', isPrimaryKey: true },
        title: { type: 'text', nullable: 'NO' },
        description: { type: 'text', nullable: 'NO' },
        date: { type: 'timestamp with time zone', nullable: 'NO' },
        classId: { type: 'integer', nullable: 'YES', isForeignKey: true, references: 'Class.id' }
      }
    },
    profiles: {
      columns: {
        id: { type: 'uuid', nullable: 'NO', isPrimaryKey: true },
        email: { type: 'text', nullable: 'YES' },
        role: { type: 'text', nullable: 'YES', default: "'user'::text" }
      }
    }
  }
}
