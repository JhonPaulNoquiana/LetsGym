import React from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Path,
  Line,
  Rect,
  Defs,
  LinearGradient,
  Stop,
  Ellipse,
} from 'react-native-svg';
import { colors as c } from '../constants/theme';

// Local vector illustrations stay sharp and are available without network image services.
export function ExerciseArt({ type = 'squat', height = 150, compact = false }) {
  const pose = {
    press: [
      'M120 76 L147 85 L165 113 M143 85 L136 118',
      'M133 84 L108 65 L94 42 M133 84 L157 65 L170 42',
    ],
    overhead: [
      'M130 77 L130 117 L110 146 M130 117 L153 146',
      'M130 87 L106 66 L106 38 M130 87 L154 66 L154 38',
    ],
    raise: [
      'M130 76 L130 117 L111 146 M130 117 L150 146',
      'M130 87 L89 78 L66 64 M130 87 L171 78 L194 64',
    ],
    cable: [
      'M130 76 L127 114 L108 143 M127 114 L151 143',
      'M130 86 L109 104 L99 80 M130 86 L149 104 L160 80',
    ],
    row: [
      'M104 78 L148 105 L151 141 M148 105 L115 140',
      'M112 84 L99 114 L89 126 M116 86 L139 71 L152 85',
    ],
    curl: [
      'M130 76 L130 117 L111 146 M130 117 L150 146',
      'M130 87 L105 112 L94 88 M130 87 L155 112 L166 88',
    ],
    squat: [
      'M130 76 L141 103 L114 117 L104 145 M141 103 L160 119 L176 145',
      'M130 87 L106 76 L94 59 M130 87 L153 76 L165 59',
    ],
    hinge: [
      'M110 77 L148 102 L146 141 M148 102 L119 142',
      'M115 84 L105 116 L99 129 M125 88 L136 119 L141 130',
    ],
    plank: [
      'M86 102 L141 105 L185 135 M141 105 L186 125',
      'M95 102 L80 130 L61 135',
    ],
    core: [
      'M105 115 L144 115 L164 91 L188 99',
      'M112 115 L97 82 L81 69 M144 115 L163 140 L187 139',
    ],
  }[type] || [
    'M130 76 L130 117 L110 146 M130 117 L150 146',
    'M130 87 L105 103 M130 87 L155 103',
  ];
  const horizontal = type === 'press' || type === 'plank' || type === 'core';
  return (
    <View
      accessibilityLabel={`${type} exercise illustration`}
      style={{
        height,
        backgroundColor: '#101C26',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 260 180">
        <Defs>
          <LinearGradient id="art-bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#16333E" />
            <Stop offset="1" stopColor="#101722" />
          </LinearGradient>
        </Defs>
        <Rect width="260" height="180" fill="url(#art-bg)" />
        {[30, 70, 110, 150, 190, 230].map((x) => (
          <Line
            key={x}
            x1={x}
            y1="0"
            x2={x}
            y2="180"
            stroke="#28424A"
            strokeWidth="0.5"
          />
        ))}
        <Circle
          cx="130"
          cy="90"
          r="66"
          stroke="#32505A"
          strokeWidth="0.8"
          fill="none"
        />
        <Ellipse cx="131" cy="153" rx="72" ry="7" fill="#080F18" />
        {type === 'press' && (
          <Path
            d="M100 122 L174 122 M110 122 L106 145 M163 122 L168 145"
            stroke="#64748B"
            strokeWidth="6"
            strokeLinecap="round"
          />
        )}
        <Circle
          cx={horizontal ? 93 : type === 'row' || type === 'hinge' ? 99 : 130}
          cy={horizontal ? 95 : type === 'row' || type === 'hinge' ? 68 : 61}
          r="12"
          fill={c.cyan}
        />
        <Path
          d={pose[0]}
          stroke={c.cyan}
          strokeWidth="10"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={pose[1]}
          stroke="#A9E9EE"
          strokeWidth="7"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
        {['press', 'squat', 'hinge'].includes(type) && (
          <>
            <Line
              x1="75"
              y1={type === 'hinge' ? 132 : 44}
              x2="187"
              y2={type === 'hinge' ? 132 : 44}
              stroke={c.lime}
              strokeWidth="4"
            />
            {[79, 87, 175, 183].map((x) => (
              <Rect
                key={x}
                x={x}
                y={type === 'hinge' ? 120 : 32}
                width="5"
                height="24"
                rx="2"
                fill={c.lime}
              />
            ))}
          </>
        )}
        {!compact && (
          <>
            <Circle cx="225" cy="23" r="3" fill={c.lime} />
            <Path d="M210 157 L232 157 M221 146 L221 168" stroke="#3A626A" />
          </>
        )}
      </Svg>
    </View>
  );
}
