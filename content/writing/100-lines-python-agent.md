---
title: "不用 LangChain：100 行原生 Python 跑通你的第一个本地 Agent"
date: "2026-11-05"
description: "想自己做一个能读写文件、执行命令的本地 Agent，但被复杂的重型框架劝退？本文剥离所有框架封装，用 100 行纯原生 Python 代码手把手带你跑通最小可用 Agent。"
tags: ["AI Agent", "Python", "开源", "手写Agent"]
source: "2026-11-05-拆穿Agent玄学-100行代码跑通最小循环.md"
---

如果你最近也在折腾 AI 开发、做独立产品，或者尝试让大模型替你干点具体活儿，你大概率动过这个念头：

**能不能自己写一个 Agent，让它在你的电脑上自动看代码、改文件、跑命令，替你完成复杂的开发任务？**

今天这篇文章，我就来帮大家把这件事彻底办成：**不用任何重型框架，只用 100 行纯原生 Python 代码，在你自己的电脑上亲手跑通一个能读写文件、能执行 Shell 命令的本地 Agent。**

---

## 01. 很多人想做自己的 Agent，但一上来就被劝退了

想做出一个能干活的 Agent，大家最常见的路径往往是去搜教程。

结果一打开网上的资料，迎面扑来的全是各种重型框架的名词：LangChain、LlamaIndex，里面充斥着 `PromptTemplate`、`RunnableSequence`、`AgentExecutor`、`OutputParser`……

很多人光是配环境、对齐框架版本就折腾了大半天，好不容易跑起来一个 Demo，马上又会撞上两堵墙：

1. **完全是黑盒，报错了根本不知道去哪查**：调用出错了，你分不清是大模型本身在幻觉，还是框架在背后偷偷拼了一大堆奇怪的提示词；
2. **跑着跑着就失控**：多问了两轮，上下文瞬间被撑爆；或者模型陷入死循环，疯狂烧你的 API 额度，你却不知道怎么给它装刹车。

折腾到最后，很多人往往得出同一个沮丧的结论：“做 Agent 门槛太高了，底层太复杂了，非得学一套庞大的框架才行。”

但事实真的如此吗？

---

## 02. 打破预期：脱掉框架外衣，Agent 本质就是一个 100 行的循环

大模型自身的能力确实强，但如果仔细拆开看，它本质上是个**“被关在玻璃房里的人”**：
- 它懂所有的代码语法，脑子里装着海量知识；
- 但它**没有手，也没有脚**。它自己无法触碰你的硬盘，也不能替你在键盘上敲下一行回车。

那么，怎样才能让它替我们干活？

**核心机制其实就像“远程管家”和“跑腿小哥”配合：**
- **大模型是管家**：只负责动脑思考，决定“接下来该干嘛”；
- **你的本地 Python 脚本是跑腿小哥**：手里握着真家伙（打开文件、写内容、运行终端命令）；
- 管家在屏幕那头写纸条发指令，小哥在本地老老实实执行，再把执行结果写回纸条递给管家。

两者之间来回传递纸条、一步一步推进任务的过程，在底层代码里，**就是一个没有任何魔法的 `while` 循环（Agent Loop）。**

市面上那些动辄几万行代码的商业 Agent（比如 Claude Code、Codex 等），核心骨架其实都跑在这个同构循环之上：

```
                    ┌─────────────────────────┐
                    │ 1. 把当前所有上下文      │
                    │    发给大模型 (LLM)      │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
         ┌──────────┤ 2. 模型判断：            │
         │          │    需要调用工具吗？     │
         │          └────────────┬────────────┘
         │                       │
      [否: 任务完成]          [是: 返回 tool_calls]
         │                       │
         ▼                       ▼
┌──────────────────┐    ┌─────────────────────────┐
│ 输出最终文字总结  │    │ 3. 本地 Python 脚本     │
│ 循环终止 (退出)  │    │    执行真实的函数       │
└──────────────────┘    └────────────┬────────────┘
                                 │
                                 ▼
                        ┌─────────────────────────┐
                        │ 4. 把执行结果拼回上下文  │
                        │    (role: "tool")       │
                        └────────────┬────────────┘
                                 │
                                 └──── 🔄 带着新结果开启下一轮
```

---

## 03. 具体怎么做：4 步手写你的第一个本地 Agent

为了让所有人都能把这个底座看明白、跑起来，我们只保留官方标准的 `openai` 依赖库（默认用 DeepSeek，换成任何兼容接口只需要改一行地址）。

整个实现分为 4 个清晰步骤：

```
步骤 1: 准备手脚（3 个普通本地函数）
   │
步骤 2: 编写工具说明书（JSON Schema）
   │
步骤 3: 调度核心（一个带上限的 while 循环）
   │
步骤 4: 兜底处理（错误自愈与防死循环）
```

### 步骤 1：准备手脚（定义 3 个纯 Python 函数）

Agent 要干活，首先得给它准备能调用的工具。这跟平时写普通 Python 函数没有任何区别：

```python
import subprocess

# 读文件
def read_file(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

# 写文件
def write_file(path: str, content: str) -> str:
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return f"成功写入 {path}（共 {len(content)} 字符）"

# 执行终端 Shell 命令
def run_shell(command: str) -> str:
    # 基础安全防线：只要涉及系统命令，必须由人眼确认
    confirm = input(f"\n[安全拦截] Agent 申请执行命令: {command}\n确认允许吗？(y/n): ")
    if confirm.strip().lower() != "y":
        return "用户拒绝执行该命令。"
    try:
        p = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=60)
        output = (p.stdout + p.stderr)[-4000:]  # 截断超长日志，防止撑爆上下文
        return output or "(命令执行成功，无输出)"
    except subprocess.TimeoutExpired:
        return "错误：命令执行超时（限制 60 秒）"

TOOL_MAPPING = {
    "read_file": read_file,
    "write_file": write_file,
    "run_shell": run_shell,
}
```

### 步骤 2：写一份标准的“工具说明书”（JSON Schema）

大模型怎么知道你有这 3 个函数？靠的是标准化描述。按照各大模型通用的格式，把函数名、用途、参数告诉模型：

```python
TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "读取本地文件内容",
            "parameters": {
                "type": "object",
                "properties": {"path": {"type": "string", "description": "目标文件路径"}},
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "向本地写入或覆盖文件内容",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "目标文件路径"},
                    "content": {"type": "string", "description": "写入的完整文本内容"},
                },
                "required": ["path", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_shell",
            "description": "在本地终端执行一条 Shell 命令并捕获输出结果",
            "parameters": {
                "type": "object",
                "properties": {"command": {"type": "string", "description": "要运行的 shell 命令"}},
                "required": ["command"],
            },
        },
    },
]
```

### 步骤 3 & 步骤 4：核心调度与异常自愈（拼装完整代码）

把大模型客户端、工具字典和主循环拼在一起，完整的脚本其实只有 90 行：

```python
import json
import os
import subprocess
import sys
from openai import OpenAI

# 初始化模型客户端（默认兼容 DeepSeek）
client = OpenAI(
    api_key=os.environ["API_KEY"],
    base_url=os.environ.get("BASE_URL", "https://api.deepseek.com"),
)
MODEL = os.environ.get("MODEL", "deepseek-flash")
MAX_STEPS = 20  # 关键防御：最多允许 Agent 转 20 轮，防止死循环烧钱

SYSTEM_PROMPT = (
    "你是一个能操作本地文件和命令行的编程助手。"
    "需要时调用工具，完成任务后直接用文字总结，不要再调用工具。"
)

def run_agent(task_prompt: str):
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": task_prompt},
    ]

    for step in range(1, MAX_STEPS + 1):
        # 1. 把当前所有上下文和工具列表发给模型
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=TOOLS_SCHEMA,
        )
        msg = response.choices[0].message
        
        # 将模型的思考与回复追加进历史上下文
        messages.append(msg.model_dump(exclude_none=True))

        # 2. 如果模型不再要求调用工具，说明它认为任务完成了，直接退出
        if not msg.tool_calls:
            print(f"\n✅ [任务完成，共历经 {step} 轮]")
            print(msg.content)
            return

        # 3. 模型要求调用工具：逐一在本地执行真实的函数
        for call in msg.tool_calls:
            func_name = call.function.name
            raw_args = call.function.arguments
            print(f"👉 [第 {step} 轮执行] 调用工具 {func_name}，参数: {raw_args}")
            
            try:
                args = json.loads(raw_args)
                result = TOOL_MAPPING[func_name](**args)
            except Exception as e:
                # 关键细节：工具报错千万不要 raise 崩溃，必须把错误文本喂给模型让它自愈
                result = f"工具执行异常: {type(e).__name__} - {e}"

            # 4. 把工具执行的实际结果以 'tool' 身份插回上下文，准备下一轮
            messages.append({
                "role": "tool",
                "tool_call_id": call.id,
                "content": result,
            })

    print(f"\n⚠️ [达到 {MAX_STEPS} 步最大保护上限，已被迫停止]")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('用法: python agent.py "你的任务"')
        sys.exit(1)
    run_agent(sys.argv[1])
```

---

## 04. 为什么这段代码能跑起来，而且不容易崩？

大家看上面的代码时，有两个细节一定要格外留意，这是保证 Agent 健壮性的关键：

### 1. 工具报错不要崩，而是喂给大模型“自我修复”
在写普通代码时，我们遇到错误习惯直接抛出异常终止程序。

但在 Agent 场景下，**错误信息恰恰是最好的修正材料**。
比如模型猜了一个文件名叫 `test.txt`，读取时报错说文件不存在。如果代码直接挂掉，任务就失败了；但如果我们把这句报错当成结果喂回给大模型，模型在下一轮看到这句提示，就会自动改主意：“那我先用 `run_shell` 跑一下 `ls` 看看当前到底有哪些文件”。

**所谓的 Agent“反思与纠错”，底层其实就是利用了模型看到错误信息后的重试推理。**

### 2. 必须加上 `MAX_STEPS` 硬刹车
永远不要用毫无节制的 `while True:`。

在复杂任务中，大模型偶尔会陷入逻辑鬼打墙（比如改了一个文件语法错误，跑命令报错，又改错，反复死循环）。如果不给它设一个最大步数上限，它不仅会短时间内消耗掉大量 Token 费用，还会让你的终端彻底失控。

---

## 05. 号召大家：今天就动手复制跑一次

写技术文章，最怕大家看完觉得“很有道理”，然后随手关掉收藏夹。

其实这一篇里所有的代码，只要你的电脑装了 Python，做两件事就能马上跑起来：

```bash
pip install openai
export API_KEY="你的模型Key"

python agent.py "在当前目录创建一个 hello.py，打印 hello world，并运行它查看结果"
```

当你亲眼看着终端里弹出命令确认提示，看着它自己创建了文件、自己调用了终端运行、最后把输出打印出来向你汇报，你会瞬间对所有复杂的 Agent 产品祛魅。

搞懂了这个只有 100 行的基础循环，之后所有复杂的能力都可以像搭积木一样往上加：
- 怕它在电脑里乱翻乱删？我们会在前面加一层**权限沙箱**；
- 跑多了上下文变大很贵？我们会在中间加一层**上下文修剪与压缩**；
- 工具太多放不下？我们会引入类似 Claude Code 的 **Skills 机制**按需加载。

在接下来的系列里，我会继续带着大家一层一层把它搭完整。

强烈建议你现在就复制这段代码在本地跑一下试试。遇到任何跑不通的报错，或者有想实现的功能，欢迎在留言区聊聊！

---

我是良逍，最近主要在折腾 AI 产品、独立开发和出海工具。

这个号会记录我自己实测过的工具、踩过的坑，以及从想法到产品上线的过程。

如果你也在折腾 AI 工具、独立开发或出海产品，欢迎来一起交流。
