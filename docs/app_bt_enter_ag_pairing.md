# app_bt_enter_ag_pairing 配对流程分析

> 源码参考：WuQi ADK `wq-audio_1.3.0.255`  
> 路径：`wq-adk/components/apps/acore/bt/src/app_bt.c`

## 结论

**真正让耳机进入可被手机搜索/连接的 Pairing 模式，是：**

```c
ret = wq_bt_set_visibility(param);  // param.visible = true, param.connectable = true
```

该调用通过 RPC 向 B 核下发 **`BT_CMD_SET_VISIBILITY`**，将蓝牙设为 **可发现（discoverable）+ 可连接（connectable）**。

---

## 函数完整流程

```c
WQ_RET app_bt_enter_ag_pairing(void)
{
    bt_cmd_set_visibility_t param;
    WQ_RET ret;

    // 前置检查
    if (!is_bt_rpc_ready()) return WQ_RET_NOT_READY;
    if (app_wws_is_slave()) return WQ_RET_OK;      // 从耳直接忽略
    if (!context->user_enabled) return WQ_RET_NOT_READY;

    app_bt_disconnect(CURRENT_DEVICE_ADDR);        // ① 断开当前手机

    context->visible = true;                       // ② 更新本地可见性状态
    context->connectable = true;
    param.visible = true;
    param.connectable = true;

    ret = wq_bt_set_visibility(param);             // ③ ★ 核心：进入 Pairing
    if (!ret) {
        if (app_bt_get_sys_state(CURRENT_DEVICE_ADDR) != STATE_AG_PAIRING) {
            app_evt_send(EVTSYS_ENTER_PAIRING);    // ④ 发送配对事件
        }
        generate_sys_state();                      // ⑤ 刷新 sys_state → ag pairing
        if (app_wws_is_connected_master()) {
            app_bt_send_peer_visibility(...);      // ⑥ TWS 主耳同步从耳
        }
    }
    return ret;
}
```

---

## 各步骤说明

| 步骤 | 函数 / 动作 | 作用 |
|------|-------------|------|
| ① | `app_bt_disconnect(CURRENT_DEVICE_ADDR)` | 断开当前已连接手机，为重新配对做准备 |
| ② | `context->visible/connectable = true` | 更新 A 核本地 BT 可见性上下文 |
| **③** | **`wq_bt_set_visibility(true, true)`** | **B 核 BT 栈进入可发现 + 可连接（核心动作）** |
| ④ | `app_evt_send(EVTSYS_ENTER_PAIRING)` | 应用层配对事件（当前非 `STATE_AG_PAIRING` 时发送） |
| ⑤ | `generate_sys_state()` | 推导并上报 `sys_state`，变为 `STATE_AG_PAIRING` |
| ⑥ | `app_bt_send_peer_visibility()` | TWS 主耳将可见性同步给从耳 |

---

## wq_bt_set_visibility 底层实现

```c
// wq-adk/components/bt_rpc/src/acore/wq_bt.c
WQ_RET wq_bt_set_visibility(bt_cmd_set_visibility_t param)
{
    return wq_send_rpc_cmd(BT_CMD_SET_VISIBILITY, &param, sizeof(param));
}
```

对应 RPC 命令：`BT_CMD_SET_VISIBILITY`（`BT_RPC_DC` 模块，index 12）。

---

## sys_state 如何变为 ag pairing

`generate_sys_state()` 会根据各 Profile 状态推导系统状态。当设备 **未连接手机** 且 **visible=true、connectable=true** 时：

```c
if (visible) {
    if (connectable) {
        state = STATE_AG_PAIRING;   // 对应日志中的 "ag pairing" / sys_state bit 0x0010
    } else {
        state = STATE_CONNECTABLE;
    }
}
```

状态变更后会发送 `EVTSYS_STATE_CHANGED`，并在 log 中可见 `sys_state 0xXXXX -> 0xXXXX`。

---

## 注意事项

1. **从耳不执行**：`app_wws_is_slave()` 为真时函数直接返回，仅主耳发起配对。
2. **与 WWS 组对区分**：`context->tws_pairing` 为真时状态为 `STATE_WWS_PAIRING`（`wws pairing`），与 AG Pairing（手机配对）不同。
3. **调用入口**：除按键/用户事件外，`app_conn.c` 等多处也会调用 `app_bt_enter_ag_pairing()`。

---

## Log 中可关注的特征

| 现象 | 说明 |
|------|------|
| `wq_send_rpc_cmd 000C ret=0` | `BT_CMD_SET_VISIBILITY` 成功（000C 为 DC 模块 cmd 12） |
| `EVTSYS_ENTER_PAIRING` | 应用层进入配对事件 |
| `sys_state ... ag pairing` | sys_state 位图含 `0x0010` |
| `app_bt_enter_ag_pairing discoverable:0=>1 connectable:0=>1` | 函数入口日志 |

---

## 相关源码路径（本机 SDK）

| 版本 | 路径 |
|------|------|
| ADK 1.3.0.255 | `D:\Project\WQ\Document\wuqi_adk_release\0909\wq-audio_1.3.0.255_20250908\wq-audio\wq-adk\components\apps\acore\bt\src\app_bt.c` |
| 旧 SDK 6.7.0.180 | `D:\Project\WQ\Document\Hardware\datasheet\IMU_Driver\sdk_twsProBLOSV_6.7.0.180_A3871\sdk\src\app\bt\app_bt.c` |
