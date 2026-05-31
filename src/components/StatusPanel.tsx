import { Fragment } from 'react';
import type { KeyboardEvent } from 'react';
import type { DeviceStatusSnapshot } from '@/types';
import { formatLinkKey } from '@/share/linkKeyLog';
import { formatMtu } from '@/share/mtuLog';
import {
  formatLinkState,
  formatMultipoint,
  formatPhoneCount,
  formatPrimaryPhone,
  formatProfileState,
  formatHfpStatus,
  toneForHfpState,
  formatTriState,
  formatTwsRole,
  formatVolume,
  formatWwsTeam,
  formatYesNo,
  formatPhoneName,
  formatPhoneAddress,
  formatCpuIdle,
  toneForCpuIdle,
  formatMemUsage,
  toneForMemUsage,
  formatFeatRes,
  formatFeatResTitle,
  formatTraffic,
  formatTrafficTitle,
  toneForTraffic,
  formatBatteryLevel,
  formatBatteryVolt,
  formatBatteryTitle,
  toneForBatteryLevel,
  formatRssiDbm,
  toneForRssiDbm,
  formatWwsRssiTitle,
  getDisplayDeviceIndices,
  phoneNameLabel,
  phoneAddressLabel,
  getPhoneCountState,
} from '@/utils/statusSnapshot';

interface StatusPanelProps {
  snapshot: DeviceStatusSnapshot;
  onNavigateToLine?: (lineIndex: number) => void;
}

interface StatusItemProps {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  sourceLine?: number | null;
  onNavigate?: (lineIndex: number) => void;
  truncate?: boolean;
  hint?: string;
}

const TONE_CLASS: Record<NonNullable<StatusItemProps['tone']>, string> = {
  default: 'text-text-primary border-border',
  success: 'text-accent-green border-accent-green/40 bg-accent-green/10',
  warning: 'text-accent-yellow border-accent-yellow/40 bg-accent-yellow/10',
  danger: 'text-accent-red border-accent-red/40 bg-accent-red/10',
  info: 'text-accent-cyan border-accent-cyan/40 bg-accent-cyan/10',
};

const META_COL_CLASS = 'w-28 shrink-0 pl-4 pr-1 pt-1.5 text-[11px] text-text-secondary whitespace-nowrap tabular-nums self-start';

function StatusItem({ label, value, tone = 'default', sourceLine, onNavigate, truncate, hint }: StatusItemProps) {
  const clickable = sourceLine != null && onNavigate != null;

  const handleClick = () => {
    if (clickable) onNavigate(sourceLine);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!clickable) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onNavigate(sourceLine);
    }
  };

  const titleParts = [
    hint,
    clickable ? `跳转到 L${sourceLine + 1}` : null,
  ].filter(Boolean);

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? handleClick : undefined}
      onKeyDown={clickable ? handleKeyDown : undefined}
      title={titleParts.length > 0 ? titleParts.join('\n') : undefined}
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs whitespace-nowrap ${TONE_CLASS[tone]} ${
        clickable ? 'cursor-pointer hover:brightness-110 active:scale-[0.98] transition-transform' : ''
      }`}
    >
      <span className="text-text-secondary">{label}</span>
      <span className={`font-medium ${truncate ? 'max-w-[220px] truncate' : ''}`}>{value}</span>
    </div>
  );
}

function toneForLink(state: DeviceStatusSnapshot['linkState']): StatusItemProps['tone'] {
  if (state === 'connected') return 'success';
  if (state === 'pairing' || state === 'connectable') return 'warning';
  if (state === 'bt_off') return 'danger';
  return 'default';
}

function toneForProfile(state: DeviceStatusSnapshot['a2dp']): StatusItemProps['tone'] {
  if (state === 'connected' || state === 'streaming') return 'success';
  if (state === 'disconnected') return 'danger';
  return 'default';
}

function toneForWws(state: DeviceStatusSnapshot['wwsTeam']): StatusItemProps['tone'] {
  if (state === 'paired' || state === 'connected') return 'success';
  if (state === 'pairing') return 'warning';
  if (state === 'disconnected') return 'danger';
  return 'default';
}

function toneForTwsRole(state: DeviceStatusSnapshot['twsRole']): StatusItemProps['tone'] {
  if (state === 'master') return 'warning';
  if (state === 'slave') return 'info';
  return 'default';
}

export default function StatusPanel({ snapshot, onNavigateToLine }: StatusPanelProps) {
  const phoneCount = getPhoneCountState(snapshot);
  const src = snapshot.sourceLines;
  const displayDevices = getDisplayDeviceIndices(snapshot);
  const showSysState = snapshot.sysStateLabels.length > 0 && snapshot.sysStateLabels[0] !== 'none';

  return (
    <div className="flex flex-shrink-0 bg-bg-secondary/80 border-b border-border">
      <div className={META_COL_CLASS}>
        截止 L{snapshot.asOfLine.toLocaleString()}
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-2 py-1 pr-4 min-w-0 content-start">
        <StatusItem
          label="连接"
          value={formatLinkState(snapshot.linkState)}
          tone={toneForLink(snapshot.linkState)}
          sourceLine={src.linkState}
          onNavigate={onNavigateToLine}
        />
        <StatusItem
          label="一拖二"
          value={formatMultipoint(snapshot.multipoint)}
          tone={snapshot.multipoint === 'on' ? 'success' : 'default'}
          sourceLine={src.multipoint}
          onNavigate={onNavigateToLine}
        />
        <StatusItem
          label="手机"
          value={formatPhoneCount(phoneCount)}
          tone={phoneCount === 'two' ? 'success' : phoneCount === 'one' ? 'info' : 'default'}
          sourceLine={src.phoneCount}
          onNavigate={onNavigateToLine}
        />
        <StatusItem
          label="Primary"
          value={formatPrimaryPhone(snapshot.primaryPhoneIndex)}
          tone={snapshot.primaryPhoneIndex !== null ? 'warning' : 'default'}
          sourceLine={src.primaryPhone}
          onNavigate={onNavigateToLine}
        />
        {displayDevices.map((index) => {
          const info = snapshot.connectedDevices[index];
          return (
            <Fragment key={`phone-${index}`}>
              <StatusItem
                label={phoneNameLabel(displayDevices, index)}
                value={formatPhoneName(info)}
                tone={info?.name ? 'info' : 'default'}
                sourceLine={src.phoneName}
                onNavigate={onNavigateToLine}
                truncate
              />
              <StatusItem
                label={phoneAddressLabel(displayDevices, index)}
                value={formatPhoneAddress(info)}
                tone={info?.address ? 'info' : 'default'}
                sourceLine={src.phoneAddress}
                onNavigate={onNavigateToLine}
              />
            </Fragment>
          );
        })}
        <StatusItem
          label="Link Key"
          value={formatLinkKey(snapshot.linkKey)}
          tone={snapshot.linkKey ? 'info' : 'default'}
          sourceLine={src.linkKey}
          onNavigate={onNavigateToLine}
          truncate
          hint={snapshot.linkKey ?? undefined}
        />
        <StatusItem
          label="MTU"
          value={formatMtu(snapshot.mtu)}
          tone={snapshot.mtu !== null ? 'info' : 'default'}
          sourceLine={src.mtu}
          onNavigate={onNavigateToLine}
        />
        <StatusItem
          label="播歌"
          value={formatYesNo(snapshot.isMusicPlaying)}
          tone={snapshot.isMusicPlaying ? 'success' : 'default'}
          sourceLine={src.isMusicPlaying}
          onNavigate={onNavigateToLine}
        />
        <StatusItem
          label="通话"
          value={formatYesNo(snapshot.isInCall)}
          tone={snapshot.isInCall ? 'warning' : 'default'}
          sourceLine={src.isInCall}
          onNavigate={onNavigateToLine}
        />
        <StatusItem
          label="A2DP"
          value={formatProfileState(snapshot.a2dp)}
          tone={toneForProfile(snapshot.a2dp)}
          sourceLine={src.a2dp}
          onNavigate={onNavigateToLine}
        />
        <StatusItem
          label="A2DP音量"
          value={formatVolume(snapshot.a2dpVolume)}
          tone={snapshot.a2dpVolume !== null ? 'info' : 'default'}
          sourceLine={src.a2dpVolume}
          onNavigate={onNavigateToLine}
        />
        <StatusItem
          label="HFP"
          value={formatHfpStatus(snapshot.hfpState, snapshot.hfp)}
          tone={snapshot.hfpState !== null ? toneForHfpState(snapshot.hfpState) : toneForProfile(snapshot.hfp)}
          sourceLine={src.hfp}
          onNavigate={onNavigateToLine}
        />
        <StatusItem
          label="HFP音量"
          value={formatVolume(snapshot.hfpVolume)}
          tone={snapshot.hfpVolume !== null ? 'info' : 'default'}
          sourceLine={src.hfpVolume}
          onNavigate={onNavigateToLine}
        />
        <StatusItem
          label="在盒"
          value={formatTriState(snapshot.inBox, '在盒', '出盒')}
          tone={snapshot.inBox === true ? 'info' : 'default'}
          sourceLine={src.inBox}
          onNavigate={onNavigateToLine}
        />
        <StatusItem
          label="充电"
          value={formatTriState(snapshot.charging, '充电中', '未充电')}
          tone={snapshot.charging === true ? 'success' : 'default'}
          sourceLine={src.charging}
          onNavigate={onNavigateToLine}
        />
        <StatusItem
          label="电量"
          value={formatBatteryLevel(snapshot.battery)}
          tone={toneForBatteryLevel(snapshot.battery)}
          sourceLine={src.battery}
          onNavigate={onNavigateToLine}
          hint={formatBatteryTitle(snapshot.battery)}
        />
        <StatusItem
          label="电压"
          value={formatBatteryVolt(snapshot.battery)}
          tone={snapshot.battery ? 'info' : 'default'}
          sourceLine={src.battery}
          onNavigate={onNavigateToLine}
          hint={formatBatteryTitle(snapshot.battery)}
        />
        <StatusItem
          label="组队"
          value={formatWwsTeam(snapshot.wwsTeam)}
          tone={toneForWws(snapshot.wwsTeam)}
          sourceLine={src.wwsTeam}
          onNavigate={onNavigateToLine}
        />
        <StatusItem
          label="手机RSSI"
          value={snapshot.wwsRssi ? formatRssiDbm(snapshot.wwsRssi.phoneRssi) : '未知'}
          tone={snapshot.wwsRssi ? toneForRssiDbm(snapshot.wwsRssi.phoneRssi) : 'default'}
          sourceLine={src.wwsRssi}
          onNavigate={onNavigateToLine}
          hint={formatWwsRssiTitle(snapshot.wwsRssi)}
        />
        <StatusItem
          label="WWS RSSI"
          value={snapshot.wwsRssi ? formatRssiDbm(snapshot.wwsRssi.wwsRssi) : '未知'}
          tone={snapshot.wwsRssi ? toneForRssiDbm(snapshot.wwsRssi.wwsRssi) : 'default'}
          sourceLine={src.wwsRssi}
          onNavigate={onNavigateToLine}
          hint={formatWwsRssiTitle(snapshot.wwsRssi)}
        />
        <StatusItem
          label="主从"
          value={formatTwsRole(snapshot.twsRole)}
          tone={toneForTwsRole(snapshot.twsRole)}
          sourceLine={src.twsRole}
          onNavigate={onNavigateToLine}
        />
        <StatusItem
          label="A核IDLE"
          value={formatCpuIdle(snapshot.cpuIdleA)}
          tone={toneForCpuIdle(snapshot.cpuIdleA)}
          sourceLine={src.cpuIdleA}
          onNavigate={onNavigateToLine}
        />
        <StatusItem
          label="B核IDLE"
          value={formatCpuIdle(snapshot.cpuIdleB)}
          tone={toneForCpuIdle(snapshot.cpuIdleB)}
          sourceLine={src.cpuIdleB}
          onNavigate={onNavigateToLine}
        />
        <StatusItem
          label="D核IDLE"
          value={formatCpuIdle(snapshot.cpuIdleD)}
          tone={toneForCpuIdle(snapshot.cpuIdleD)}
          sourceLine={src.cpuIdleD}
          onNavigate={onNavigateToLine}
        />
        <StatusItem
          label="A核内存"
          value={formatMemUsage(snapshot.memA)}
          tone={toneForMemUsage(snapshot.memA)}
          sourceLine={src.memA}
          onNavigate={onNavigateToLine}
        />
        <StatusItem
          label="B核内存"
          value={formatMemUsage(snapshot.memB)}
          tone={toneForMemUsage(snapshot.memB)}
          sourceLine={src.memB}
          onNavigate={onNavigateToLine}
        />
        <StatusItem
          label="D核内存"
          value={formatMemUsage(snapshot.memD)}
          tone={toneForMemUsage(snapshot.memD)}
          sourceLine={src.memD}
          onNavigate={onNavigateToLine}
        />
        <StatusItem
          label="FeatRes"
          value={formatFeatRes(snapshot.featRes)}
          tone={snapshot.featRes && snapshot.featRes.activeModules[0] !== 'none' ? 'info' : 'default'}
          sourceLine={src.featRes}
          onNavigate={onNavigateToLine}
          hint={formatFeatResTitle(snapshot.featRes)}
          truncate
        />
        <StatusItem
          label="Traffic"
          value={formatTraffic(snapshot.traffic)}
          tone={toneForTraffic(snapshot.traffic)}
          sourceLine={src.traffic}
          onNavigate={onNavigateToLine}
          hint={formatTrafficTitle(snapshot.traffic)}
          truncate
        />
        {showSysState && (
          <StatusItem
            label="SysState"
            value={snapshot.sysStateLabels.join(', ')}
            tone="info"
            sourceLine={src.sysState}
            onNavigate={onNavigateToLine}
            truncate
          />
        )}
        {snapshot.lastEvent && (
          <span
            role={src.lastEvent != null && onNavigateToLine ? 'button' : undefined}
            tabIndex={src.lastEvent != null && onNavigateToLine ? 0 : undefined}
            onClick={src.lastEvent != null && onNavigateToLine ? () => onNavigateToLine(src.lastEvent!) : undefined}
            onKeyDown={src.lastEvent != null && onNavigateToLine ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onNavigateToLine(src.lastEvent!);
              }
            } : undefined}
            title={src.lastEvent != null && onNavigateToLine ? `跳转到 L${src.lastEvent + 1}` : undefined}
            className={`text-[11px] text-text-secondary truncate max-w-[320px] ${
              src.lastEvent != null && onNavigateToLine
                ? 'cursor-pointer hover:text-text-primary underline-offset-2 hover:underline'
                : ''
            }`}
          >
            最近事件: {snapshot.lastEvent}
          </span>
        )}
      </div>
    </div>
  );
}
