import { createContext, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";
export type FontSize = "small" | "medium" | "large";
export type CalendarView = "yearly" | "monthly" | "weekly";
export type Language = "english" | "mandarin";

export interface Subtask { id: string; title: string; done: boolean }
export interface Assignment {
  id: string;
  title: string;
  due: string;
  status: "Opened" | "Completed" | "Late";
  description: string;
  resources: { name: string; link: string }[];
  subtasks?: Subtask[];
  priority?: "low" | "medium" | "high";
  tags?: string[];
  notes?: string;
}

export interface ActionPlanStep {
  action: string;
  date: string;
  progress: string;
  status: string;
}
export interface ActionPlan {
  id: string;
  title: string;
  steps: ActionPlanStep[];
}

export interface RedeemedVoucher {
  id: string;
  name: string;
  code: string;
  redeemedAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

export interface State {
  settings: {
    geminiKey: string;
    assistantPersonality: "tutor" | "coach" | "zen";
    theme: Theme;
    notifications: boolean;
    fontSize: FontSize;
    calendarView: CalendarView;
    language: Language;
    studyDuration: number;
    breakDuration: number;
  };
  assignments: Assignment[];
  timetable: {
    hasData: boolean;
    schedule: Record<string, string[]>;
  };
  timer: {
    isRunning: boolean;
    isPaused: boolean;
    timeLeft: number;
    isBreak: boolean;
    isFullscreen: boolean;
  };
  gamification: {
    points: number;
    level: number;
    assignmentsToNextLevel: number;
    completedCount: number;
    redeemedVouchers: RedeemedVoucher[];
  };
  actionPlans: Record<string, ActionPlan>;
  chat: ChatMessage[];
}

const DEFAULT_STATE: State = {
  settings: {
    geminiKey: "",
    assistantPersonality: "tutor",
    theme: "light",
    notifications: true,
    fontSize: "medium",
    calendarView: "monthly",
    language: "english",
    studyDuration: 30,
    breakDuration: 5,
  },
  assignments: [
    {
      id: "math-practice-3",
      title: "Math: Practice 3, Page 203-205",
      due: "2025-11-07T11:00:00",
      status: "Opened",
      description:
        "In this assignment, you will complete textbook pages 203 to 205. All work is to be completed in your math workbooks and will be reviewed in class. This practice activity will cover practice questions on the topics of Area, Perimeter and Volume. All work is expected to be done in full working out, using the method taught in class.",
      resources: [{ name: "MYP Year 2 Oxford Math Text Book", link: "#" }],
    },
    {
      id: "english-hatchet",
      title: "English: Chapters 5 and 6 of Hatchet",
      due: "2025-11-10T11:00:00",
      status: "Opened",
      description:
        "Read chapters 5 and 6 of Hatchet. Write a short summary of Brian's realization about his survival requirements.",
      resources: [{ name: "Hatchet PDF novel link", link: "#" }],
    },
  ],
  timetable: {
    hasData: false,
    schedule: {
      Monday: ["Math", "Malay", "Break", "I&S", "Design"],
      Tuesday: ["Science", "Music", "Break", "Swimming", "Design"],
      Wednesday: ["Mandarin", "Malay", "Break", "P.E.", "English"],
      Thursday: ["English", "Design", "Break", "Math", "Mandarin"],
      Friday: ["Host Country", "Leadership", "Break", "Study Hall", "Explorations"],
    },
  },
  timer: { isRunning: false, isPaused: false, timeLeft: 30 * 60, isBreak: false, isFullscreen: false },
  gamification: { points: 150, level: 1, assignmentsToNextLevel: 5, completedCount: 0, redeemedVouchers: [] },
  actionPlans: {
    "roman-empire": {
      id: "roman-empire",
      title: "Action Plan of The Roman Empire",
      steps: [
        {
          action:
            "Start researching about the rise of the empire. Find out information on how the empire rose to power, and under who's leadership.",
          date: "Completion date: 6th November\nEstimated Completion time: 1 hour\nBreakdown: 1 hour research",
          progress: "Status: Completed\nTime Used: 45 minutes\nTime Division: 45 minutes research",
          status: "Completed",
        },
        {
          action:
            "Began your timeline. Start by writing down the information gathered for the beginging of the empire. Use images to support your information.",
          date: "Completion date: 7th November\nEstimated Completion time: 30 minutes\nBreakdown: 30 minutes",
          progress: "Status: In-progress\nTime Used: N/A\nTime Division: N/A",
          status: "In-progress",
        },
        {
          action:
            "Research on 2-3 key points and events that occured during the Roman Empire. You can research points ike the British Conquest and the Great Fire of Rome",
          date: "Completion date: 7th November\nEstimated Completion time: 1 hour 30 minutes\nBreakdown: 1 hour research\n30 minutes writing",
          progress: "Status: In-progress\nTime Used: N/A\nTime Division: N/A",
          status: "In-progress",
        },
      ],
    },
  },
  chat: [],
};

type Action =
  | { type: "PATCH_SETTINGS"; patch: Partial<State["settings"]> }
  | { type: "REPLACE"; state: State }
  | { type: "COMPLETE_ASSIGNMENT"; id: string }
  | { type: "LATE_ASSIGNMENT"; id: string }
  | { type: "ADD_ASSIGNMENT"; assignment: Assignment }
  | { type: "UPDATE_ASSIGNMENT"; id: string; patch: Partial<Assignment> }
  | { type: "DELETE_ASSIGNMENT"; id: string }
  | { type: "REDEEM"; voucher: { id: string; name: string; cost: number; codePrefix: string } }
  | { type: "TIMER_TICK" }
  | { type: "TIMER_SET"; patch: Partial<State["timer"]> }
  | { type: "UPLOAD_TIMETABLE" }
  | { type: "ADD_ACTION_PLAN"; plan: ActionPlan }
  | { type: "PUSH_CHAT"; msg: ChatMessage }
  | { type: "CLEAR_CHAT" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "REPLACE":
      return action.state;
    case "PATCH_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "COMPLETE_ASSIGNMENT": {
      const assignments = state.assignments.map((a) =>
        a.id === action.id && a.status !== "Completed" ? { ...a, status: "Completed" as const } : a,
      );
      const wasCompleted = state.assignments.find((a) => a.id === action.id)?.status === "Completed";
      if (wasCompleted) return state;
      const completedCount = state.gamification.completedCount + 1;
      const required = state.gamification.assignmentsToNextLevel;
      const level = completedCount >= required ? state.gamification.level + 1 : state.gamification.level;
      const remaining = completedCount >= required ? completedCount - required : completedCount;
      return {
        ...state,
        assignments,
        gamification: {
          ...state.gamification,
          points: state.gamification.points + 3,
          completedCount: remaining,
          level,
        },
      };
    }
    case "LATE_ASSIGNMENT": {
      const assignments = state.assignments.map((a) =>
        a.id === action.id ? { ...a, status: "Late" as const } : a,
      );
      return {
        ...state,
        assignments,
        gamification: { ...state.gamification, points: Math.max(0, state.gamification.points - 5) },
      };
    }
    case "ADD_ASSIGNMENT":
      return { ...state, assignments: [action.assignment, ...state.assignments] };
    case "UPDATE_ASSIGNMENT":
      return { ...state, assignments: state.assignments.map((a) => a.id === action.id ? { ...a, ...action.patch } : a) };
    case "DELETE_ASSIGNMENT":
      return { ...state, assignments: state.assignments.filter((a) => a.id !== action.id) };
    case "REDEEM": {
      if (state.gamification.points < action.voucher.cost) return state;
      const code = `${action.voucher.codePrefix}-${action.voucher.cost}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;
      return {
        ...state,
        gamification: {
          ...state.gamification,
          points: state.gamification.points - action.voucher.cost,
          redeemedVouchers: [
            ...state.gamification.redeemedVouchers,
            { id: action.voucher.id, name: action.voucher.name, code, redeemedAt: new Date().toISOString() },
          ],
        },
      };
    }
    case "TIMER_TICK":
      if (!state.timer.isRunning || state.timer.isPaused) return state;
      if (state.timer.timeLeft <= 1)
        return { ...state, timer: { ...state.timer, timeLeft: 0, isRunning: false } };
      return { ...state, timer: { ...state.timer, timeLeft: state.timer.timeLeft - 1 } };
    case "TIMER_SET":
      return { ...state, timer: { ...state.timer, ...action.patch } };
    case "UPLOAD_TIMETABLE":
      return { ...state, timetable: { ...state.timetable, hasData: true } };
    case "ADD_ACTION_PLAN":
      return { ...state, actionPlans: { ...state.actionPlans, [action.plan.id]: action.plan } };
    case "PUSH_CHAT":
      return { ...state, chat: [...state.chat, action.msg] };
    case "CLEAR_CHAT":
      return { ...state, chat: [] };
    default:
      return state;
  }
}

const Ctx = createContext<{ state: State; dispatch: React.Dispatch<Action>; hydrated: boolean } | null>(null);

const STORAGE_KEY = "focusly-state-v1";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);
  const hydratedRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as State;
        dispatch({ type: "REPLACE", state: { ...DEFAULT_STATE, ...parsed, settings: { ...DEFAULT_STATE.settings, ...parsed.settings } } });
      }
    } catch {}
    hydratedRef.current = true;
    setHydrated(true);
  }, []);

  // Persist
  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  // Apply theme + font size
  useEffect(() => {
    const root = document.documentElement;
    if (state.settings.theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    const sizes: Record<FontSize, string> = { small: "14px", medium: "16px", large: "19px" };
    root.style.setProperty("--base-font-size", sizes[state.settings.fontSize]);
  }, [state.settings.theme, state.settings.fontSize]);

  // Timer tick
  useEffect(() => {
    if (!state.timer.isRunning || state.timer.isPaused) return;
    const id = setInterval(() => dispatch({ type: "TIMER_TICK" }), 1000);
    return () => clearInterval(id);
  }, [state.timer.isRunning, state.timer.isPaused]);

  return <Ctx.Provider value={{ state, dispatch, hydrated }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be inside StoreProvider");
  return c;
}

// i18n
const DICT = {
  english: {
    console: "Console",
    assignments: "Assignments",
    calender: "Calender",
    settings: "Settings",
    rewards: "Rewards",
    askAI: "Ask AI for help",
    timetable: "Timetable",
    files: "Files",
    studyClock: "Study Clock",
    noTimetable: "No Timetable",
    uploadFile: "Upload file",
    takePicture: "Take Picture",
    clockPaused: "Clock Paused",
    restartClock: "Restart Clock",
    resumeClock: "Resume Clock",
    fullScreen: "Full-Screen",
    opened: "Opened",
    completed: "Completed",
    late: "Late",
    markComplete: "Mark Complete",
    markLate: "Mark Late",
    dueDate: "Due",
    level: "Level",
    points: "points",
    redeem: "Redeem",
    redeemed: "Redeemed",
    pointsRule: "+3 points for completed assignment, -5 points for late submission",
    nextLevel: "5 assignments required for Level 2",
    selectLanguage: "Select Language",
    colorMode: "Color Mode",
    light: "Light",
    dark: "Dark",
    notifications: "Notifications",
    yes: "Yes",
    no: "No",
    fontSize: "Font Size",
    small: "Small",
    medium: "Medium",
    large: "Large",
    calendarView: "Calender View",
    yearly: "Yearly",
    monthly: "Monthly",
    weekly: "Weekly",
    language: "Language",
    english: "English",
    mandarin: "Mandarin",
  },
  mandarin: {
    console: "控制台",
    assignments: "作业",
    calender: "日历",
    settings: "设置",
    rewards: "奖励",
    askAI: "向AI求助",
    timetable: "课程表",
    files: "文件",
    studyClock: "学习计时器",
    noTimetable: "无课程表",
    uploadFile: "上传文件",
    takePicture: "拍照",
    clockPaused: "已暂停",
    restartClock: "重新开始",
    resumeClock: "继续",
    fullScreen: "全屏",
    opened: "已开启",
    completed: "已完成",
    late: "迟交",
    markComplete: "标记完成",
    markLate: "标记迟交",
    dueDate: "截止",
    level: "等级",
    points: "积分",
    redeem: "兑换",
    redeemed: "已兑换",
    pointsRule: "完成作业+3分,迟交-5分",
    nextLevel: "升到2级需完成5个作业",
    selectLanguage: "选择语言",
    colorMode: "颜色模式",
    light: "浅色",
    dark: "深色",
    notifications: "通知",
    yes: "是",
    no: "否",
    fontSize: "字体大小",
    small: "小",
    medium: "中",
    large: "大",
    calendarView: "日历视图",
    yearly: "年",
    monthly: "月",
    weekly: "周",
    language: "语言",
    english: "英语",
    mandarin: "中文",
  },
} as const;

export function useT() {
  const { state } = useStore();
  return (key: keyof typeof DICT["english"]) => DICT[state.settings.language][key] ?? key;
}
