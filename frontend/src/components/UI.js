import React from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors as c, fonts as f } from '../constants/theme';

export const Icon = ({ name, size = 20, color = c.muted }) => (
  <Feather name={name} size={size} color={color} />
);
export function Txt({ children, style, muted, mono, ...props }) {
  return (
    <Text
      {...props}
      style={[
        s.text,
        muted && { color: c.muted },
        mono && { fontFamily: f.mono },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Heading({ children, small, style }) {
  return (
    <Txt style={[s.heading, small && { fontSize: 20 }, style]}>{children}</Txt>
  );
}
export function Label({ children, color = c.muted, style }) {
  return (
    <Txt mono style={[s.label, { color }, style]}>
      {children}
    </Txt>
  );
}
export function Card({ children, style }) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Row({ children, style }) {
  return <View style={[s.row, style]}>{children}</View>;
}
export function Button({
  title,
  onPress,
  icon,
  variant = 'primary',
  disabled,
  loading,
  style,
}) {
  const foreground =
    variant === 'primary' ? c.ink : variant === 'danger' ? c.danger : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        variant !== 'primary' && {
          backgroundColor: c.elevated,
          borderWidth: 1,
          borderColor: c.border,
        },
        (disabled || loading) && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={foreground} />
      ) : (
        icon && <Icon name={icon} color={foreground} size={18} />
      )}
      <Txt style={{ fontFamily: f.display, color: foreground, fontSize: 15 }}>
        {title}
      </Txt>
    </Pressable>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  disabled,
  color = c.muted,
  style,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.iconButton,
        disabled && { opacity: 0.3 },
        pressed && { backgroundColor: c.border },
        style,
      ]}
    >
      <Icon name={name} color={color} size={19} />
    </Pressable>
  );
}
export function Chip({ children, active, onPress, style }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      disabled={!onPress}
      onPress={onPress}
      style={[
        s.chip,
        active && { backgroundColor: c.lime, borderColor: c.lime },
        style,
      ]}
    >
      <Txt
        style={{
          color: active ? c.ink : c.muted,
          fontFamily: f.medium,
          fontSize: 12,
        }}
      >
        {children}
      </Txt>
    </Pressable>
  );
}
export function Field({ label, value, onChangeText, style, ...props }) {
  return (
    <View style={[{ gap: 8 }, style]}>
      {label && <Label>{label}</Label>}
      <TextInput
        accessibilityLabel={label || props.placeholder}
        placeholderTextColor={c.faint}
        selectionColor={c.lime}
        value={value}
        onChangeText={onChangeText}
        style={s.input}
        {...props}
      />
    </View>
  );
}
export function Empty({
  icon = 'activity',
  title,
  description,
  action,
  onPress,
}) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 30, gap: 12 }}>
      <Icon name={icon} size={30} color={c.cyan} />
      <Heading small style={{ textAlign: 'center' }}>
        {title}
      </Heading>
      <Txt muted style={{ textAlign: 'center', lineHeight: 21 }}>
        {description}
      </Txt>
      {action && (
        <Button
          title={action}
          onPress={onPress}
          style={{ marginTop: 8, alignSelf: 'stretch' }}
        />
      )}
    </Card>
  );
}
export function SectionTitle({ title, label, onPress }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
      <Heading small>{title}</Heading>
      {label &&
        (onPress ? (
          <Pressable accessibilityRole="button" onPress={onPress}>
            <Label color={c.lime}>{label}</Label>
          </Pressable>
        ) : (
          <Label color={c.lime}>{label}</Label>
        ))}
    </Row>
  );
}
export function Stat({ label, value, foot, color = c.lime }) {
  return (
    <Card style={{ flex: 1, padding: 13, gap: 8 }}>
      <Label style={{ fontSize: 9 }}>{label}</Label>
      <Txt mono style={{ fontSize: 26, color }}>
        {value}
      </Txt>
      {foot && (
        <Txt muted style={{ fontSize: 10 }}>
          {foot}
        </Txt>
      )}
    </Card>
  );
}
export function Page({ children, ...props }) {
  return (
    <ScrollView
      {...props}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.page}
    >
      {children}
    </ScrollView>
  );
}
export function ScreenTitle({ eyebrow, title, description }) {
  return (
    <View style={{ gap: 8, marginBottom: 4 }}>
      {eyebrow && <Label color={c.cyan}>{eyebrow}</Label>}
      <Heading>{title}</Heading>
      {description && (
        <Txt muted style={{ lineHeight: 22 }}>
          {description}
        </Txt>
      )}
    </View>
  );
}
export const s = StyleSheet.create({
  text: { fontFamily: f.body, color: c.text, fontSize: 14 },
  heading: {
    fontFamily: f.display,
    fontSize: 30,
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontSize: 10,
    lineHeight: 16,
  },
  card: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 18,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  button: {
    backgroundColor: c.lime,
    borderRadius: 28,
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  iconButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: c.elevated,
  },
  chip: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 24,
    paddingHorizontal: 15,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: c.elevated,
    borderWidth: 1,
    borderColor: c.border,
    color: c.text,
    fontFamily: f.body,
    fontSize: 15,
  },
  page: { padding: 20, paddingBottom: 32, gap: 22 },
});
