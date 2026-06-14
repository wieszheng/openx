/**
 * Persistence - 聊天记录持久化
 *
 * 将 ChatMessage 列表持久化到 localStorage，按工作流 ID 隔离。
 * 提供保存、加载、清除三个核心操作，支持序列化/反序列化。
 */

import type { ChatMessage, SubGoalDisplay } from './use-agent'

/** localStorage key 前缀 */
const STORAGE_KEY_PREFIX = 'openx:agent:chat:'

/** 持久化数据结构 */
interface PersistedData {
  /** 消息列表 */
  messages: ChatMessage[]
  /** 子目标 */
  subGoals: SubGoalDisplay[]
  /** 保存时间戳 */
  savedAt: number
}

/**
 * 生成存储 key
 *
 * @param workflowId - 工作流 ID
 * @returns localStorage key
 */
function getStorageKey(workflowId: string): string {
  return `${STORAGE_KEY_PREFIX}${workflowId}`
}

/**
 * 保存聊天记录到 localStorage
 *
 * @param workflowId - 工作流 ID
 * @param messages - 消息列表
 * @param subGoals - 子目标列表
 */
export function saveChat(
  workflowId: string,
  messages: ChatMessage[],
  subGoals: SubGoalDisplay[],
): void {
  try {
    const data: PersistedData = {
      messages,
      subGoals,
      savedAt: Date.now(),
    }
    localStorage.setItem(getStorageKey(workflowId), JSON.stringify(data))
  } catch {
    // localStorage 可能已满或不可用，静默忽略
    console.warn('[AgentPersistence] Failed to save chat data')
  }
}

/**
 * 从 localStorage 加载聊天记录
 *
 * @param workflowId - 工作流 ID
 * @returns 持久化的消息列表和子目标，无数据时返回 null
 */
export function loadChat(workflowId: string): { messages: ChatMessage[]; subGoals: SubGoalDisplay[] } | null {
  try {
    const raw = localStorage.getItem(getStorageKey(workflowId))
    if (!raw) return null

    const data: PersistedData = JSON.parse(raw)

    // 简单校验
    if (!Array.isArray(data.messages)) return null

    return {
      messages: data.messages,
      subGoals: data.subGoals ?? [],
    }
  } catch {
    console.warn('[AgentPersistence] Failed to load chat data')
    return null
  }
}

/**
 * 清除指定工作流的聊天记录
 *
 * @param workflowId - 工作流 ID
 */
export function clearChat(workflowId: string): void {
  try {
    localStorage.removeItem(getStorageKey(workflowId))
  } catch {
    console.warn('[AgentPersistence] Failed to clear chat data')
  }
}
