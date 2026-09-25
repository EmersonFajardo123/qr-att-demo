import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
// import { STUDENT_ID } from '@/constants/student';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  type AttendanceRecord,
  type TeacherEventAttendance,
} from '@/lib/attendance';

export default function HistoryScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<
    TeacherEventAttendance[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const profile = await getProfile(user.id);
    const currentRole = profile?.role ?? 'student';

    setRole(currentRole);

    if (currentRole === 'teacher') {
      const events = await getTeacherEventAttendance(user.id);

      setTeacherEvents(events);
      setRecords([]);
    } else {
      // getAttendanceHistory(STUDENT_ID).then((rows) => {
      const studentId = user.id;
      const rows = await getAttendanceHistory(studentId);

      setRecords(rows);
      setTeacherEvents([]);
    }

    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Attendance History</Text>
        <Text style={styles.subtitle}>Loading records...</Text>
      </View>
    );
  }

  if (role === 'teacher') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Attendance History</Text>

        <Text style={styles.teacherSubtitle}>
          Events you created and their attendance
        </Text>

        {teacherEvents.length === 0 ? (
          <Text style={styles.subtitle}>
            No events yet. Create an event from the Teacher tab to
            see attendance here.
          </Text>
        ) : (
          <FlatList
            data={teacherEvents}
            keyExtractor={(item) => item.eventId}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.eventHeader}>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>
                      {item.title}
                    </Text>

                    <Text style={styles.eventMeta}>
                      {item.eventCode}
                    </Text>

                    <Text style={styles.eventMeta}>
                      {formatDate(item.startTime)}
                    </Text>
                  </View>

                  <View style={styles.countBadge}>
                    <Text style={styles.countNumber}>
                      {item.attendeeCount}
                    </Text>

                    <Text style={styles.countLabel}>
                      {item.attendeeCount === 1
                        ? 'attendee'
                        : 'attendees'}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <Text style={styles.attendeesTitle}>
                  Students
                </Text>

                {item.attendees.length === 0 ? (
                  <Text style={styles.noAttendees}>
                    No students have scanned this QR code yet.
                  </Text>
                ) : (
                  item.attendees.map((attendee) => (
                    <View
                      key={`${item.eventId}-${attendee.studentId}-${attendee.scannedAt}`}
                      style={styles.attendeeRow}
                    >
                      <Text style={styles.studentId}>
                        {shortId(attendee.studentId)}
                      </Text>

                      <Text style={styles.eventMeta}>
                        {formatDate(attendee.scannedAt)}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance History</Text>

      {records.length === 0 ? (
        <Text style={styles.subtitle}>
          No records yet. Scan a QR code to register your attendance.
        </Text>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.eventTitle}>
                {item.eventTitle}
              </Text>

              <Text style={styles.eventMeta}>
                {item.eventId}
              </Text>

              <Text style={styles.eventMeta}>
                {formatDate(item.scannedAt)}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function shortId(id: string) {
  return id ? `…${id.slice(-8)}` : 'unknown';
}

function formatDate(iso: string | null) {
  if (!iso) {
    return 'No date set';
  }

  return new Date(iso).toLocaleString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 32,
  },
  teacherSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventInfo: {
    flex: 1,
    paddingRight: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  eventMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    minWidth: 64,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  countNumber: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  countLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },
  attendeesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  attendeeRow: {
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  studentId: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  noAttendees: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});