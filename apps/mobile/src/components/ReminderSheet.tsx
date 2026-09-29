import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatKoreanDate, formatKoreanDateTime, formatKoreanTime } from "../lib/dateFormat";
import type { ReminderPref } from "../lib/reminderPrefs";
import { computeReminderTimes, type ReminderSchedule } from "../lib/reminderSync";

type SheetItem = { title: string; due_date: string | null; is_done: boolean };

function defaultCustomTime(item: SheetItem, schedule: ReminderSchedule): Date {
  const auto = computeReminderTimes(item, schedule, { mode: "auto" });
  if (auto.length > 0) return auto[0].at;
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(schedule.hour, 0, 0, 0);
  return d;
}

export default function ReminderSheet({
  visible,
  item,
  schedule,
  pref,
  onClose,
  onSave,
}: {
  visible: boolean;
  item: SheetItem | null;
  schedule: ReminderSchedule;
  pref: ReminderPref;
  onClose: () => void;
  onSave: (pref: ReminderPref) => void;
}) {
  const [mode, setMode] = useState<ReminderPref["mode"]>(pref.mode);
  const [customAt, setCustomAt] = useState<Date>(new Date());
  // Modal은 화면 끝까지 그려져서 하단 내비게이션 바가 저장 버튼을 가린다.
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible || !item) return;
    setMode(pref.mode);
    setCustomAt(pref.mode === "custom" ? new Date(pref.at) : defaultCustomTime(item, schedule));
  }, [visible, item, pref, schedule]);

  if (!item) return null;

  const autoTimes = computeReminderTimes(item, schedule, { mode: "auto" });
  const customInPast = customAt.getTime() <= Date.now();
  const canSave = mode !== "custom" || !customInPast;

  function pickDate() {
    DateTimePickerAndroid.open({
      value: customAt,
      mode: "date",
      minimumDate: new Date(),
      onChange: (event, date) => {
        if (event.type !== "set" || !date) return;
        const next = new Date(customAt);
        next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        setCustomAt(next);
      },
    });
  }

  function pickTime() {
    DateTimePickerAndroid.open({
      value: customAt,
      mode: "time",
      is24Hour: false,
      onChange: (event, date) => {
        if (event.type !== "set" || !date) return;
        const next = new Date(customAt);
        next.setHours(date.getHours(), date.getMinutes(), 0, 0);
        setCustomAt(next);
      },
    });
  }

  function save() {
    if (!canSave) return;
    onSave(mode === "custom" ? { mode: "custom", at: customAt.toISOString() } : { mode });
  }

  const autoDescription = !item.due_date
    ? "기한이 없어서 자동 알림은 없어요"
    : autoTimes.length === 0
      ? "자동 알림 시각이 이미 지났어요"
      : autoTimes.length === 1
        ? formatKoreanDateTime(autoTimes[0].at)
        : `${formatKoreanDate(autoTimes[0].at)}부터 매일 ${formatKoreanTime(autoTimes[0].at)}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>알림 설정</Text>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.due_date && <Text style={styles.dueText}>기한 {formatKoreanDate(item.due_date)}</Text>}

        <Option
          selected={mode === "auto"}
          label="자동으로 알려주기"
          description={autoDescription}
          onPress={() => setMode("auto")}
        />
        <Option
          selected={mode === "custom"}
          label="날짜·시간 직접 정하기"
          onPress={() => setMode("custom")}
        />
        {mode === "custom" && (
          <View style={styles.pickerRow}>
            <TouchableOpacity style={styles.pickerButton} onPress={pickDate}>
              <Text style={styles.pickerLabel}>날짜</Text>
              <Text style={styles.pickerValue}>{formatKoreanDate(customAt)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pickerButton} onPress={pickTime}>
              <Text style={styles.pickerLabel}>시간</Text>
              <Text style={styles.pickerValue}>{formatKoreanTime(customAt)}</Text>
            </TouchableOpacity>
          </View>
        )}
        {mode === "custom" && customInPast && (
          <Text style={styles.errorText}>이미 지난 시각이에요. 앞으로의 날짜·시간을 골라주세요.</Text>
        )}
        <Option
          selected={mode === "off"}
          label="이 항목은 알리지 않기"
          onPress={() => setMode("off")}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={save}
            disabled={!canSave}
          >
            <Text style={styles.saveText}>저장</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Option({
  selected,
  label,
  description,
  onPress,
}: {
  selected: boolean;
  label: string;
  description?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.option} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.radio}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <View style={styles.optionTextBox}>
        <Text style={styles.optionLabel}>{label}</Text>
        {description && <Text style={styles.optionDescription}>{description}</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(11,31,77,0.42)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#C7DBFB",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0B1F4D",
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0B1F4D",
    marginTop: 6,
  },
  dueText: {
    fontSize: 13,
    color: "#F23B3B",
    marginTop: 2,
    marginBottom: 4,
  },
  option: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#1B64F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 1,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#1B64F2",
  },
  optionTextBox: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0B1F4D",
  },
  optionDescription: {
    fontSize: 13,
    color: "#3D5A9C",
    marginTop: 2,
  },
  pickerRow: {
    flexDirection: "row",
    marginLeft: 34,
    marginBottom: 4,
  },
  pickerButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#C7DBFB",
    backgroundColor: "#F3F8FF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  pickerLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3D5A9C",
  },
  pickerValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1B64F2",
    marginTop: 2,
  },
  errorText: {
    fontSize: 12,
    color: "#F23B3B",
    marginLeft: 34,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 18,
  },
  button: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButton: {
    borderWidth: 1.5,
    borderColor: "#1B64F2",
    marginRight: 10,
  },
  cancelText: {
    color: "#1B64F2",
    fontSize: 15,
    fontWeight: "700",
  },
  saveButton: {
    backgroundColor: "#1B64F2",
  },
  saveButtonDisabled: {
    backgroundColor: "#9DBEF7",
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
