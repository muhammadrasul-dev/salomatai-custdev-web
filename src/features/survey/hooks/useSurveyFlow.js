import { useCallback, useMemo, useState } from 'react'

const sequence = [
  'q0',
  'q1',
  'q1_1',
  'q2',
  'q3',
  'q4',
  'q5',
  'q6',
  'q7',
  'q5_alt',
  'q8',
  'q9',
  'q10',
  'q11',
  'q12',
  'q13',
  'q13_alt',
  'q11_alt',
  'q14',
  'q15',
  'q16',
  'q17',
]

export const useSurveyFlow = (questions) => {
  const [answers, setAnswers] = useState({})
  const [currentId, setCurrentId] = useState('q0')
  const [history, setHistory] = useState([])
  const [status, setStatus] = useState('active')

  const questionMap = useMemo(
    () => Object.fromEntries(questions.map((question) => [question.id, question])),
    [questions],
  )

  const currentQuestion = questionMap[currentId]

  const extractAnswerValue = useCallback((answer) => {
    if (answer && typeof answer === 'object' && !Array.isArray(answer) && typeof answer.value === 'string') {
      return answer.value
    }
    return answer
  }, [])

  const updateAnswer = (questionId, value) => {
    setAnswers((previous) => ({ ...previous, [questionId]: value }))
  }

  const getDefaultNextId = useCallback((questionId) => {
    const index = sequence.indexOf(questionId)
    if (index === -1 || index === sequence.length - 1) {
      return null
    }

    return sequence[index + 1]
  }, [])

  const resolveNext = useCallback((questionId, answer) => {
    const normalizedAnswer = extractAnswerValue(answer)
    const question = questionMap[questionId]
    if (typeof question?.next === 'function') {
      return question.next(normalizedAnswer)
    }

    if (questionId === 'q4') {
      return normalizedAnswer === 'yes' ? 'q5' : 'q5_alt'
    }

    if (questionId === 'q7') {
      return 'q8'
    }

    if (questionId === 'q5_alt') {
      return 'q8'
    }

    if (questionId === 'q10') {
      return normalizedAnswer === 'yes' ? 'q11' : 'q11_alt'
    }

    if (questionId === 'q13' || questionId === 'q13_alt' || questionId === 'q11_alt') {
      return 'q14'
    }

    if (questionId === 'q12') {
      return normalizedAnswer === 'yes' ? 'q13' : 'q13_alt'
    }

    if (questionId === 'q15') {
      return normalizedAnswer === 'yes' ? 'q16' : 'q17'
    }

    if (questionId === 'q17') {
      const contactDecision = extractAnswerValue(answers.q15)
      return contactDecision === 'yes' ? null : 'end_no_contact'
    }

    if (questionId === 'q1_1') {
      return normalizedAnswer === 'yes' ? 'q2' : 'end_not_relevant'
    }

    return getDefaultNextId(questionId)
  }, [answers.q15, extractAnswerValue, getDefaultNextId, questionMap])

  const getFallbackAnswer = useCallback((question) => {
    if (!question) {
      return undefined
    }

    if (question.type === 'scale') {
      return question.min ?? 1
    }

    if (question.type === 'multi_choice') {
      return []
    }

    if (question.type === 'money') {
      return { amount: '1', currency: question.defaultCurrency ?? 'USD' }
    }

    if (question.type === 'short_text' || question.type === 'long_text') {
      return 'placeholder'
    }

    return undefined
  }, [])

  const projectedTotalSteps = useMemo(() => {
    const countFrom = (questionId, seen = new Set()) => {
      if (!questionId || questionId.startsWith('end_') || seen.has(questionId)) {
        return 0
      }

      const question = questionMap[questionId]
      if (!question) {
        return 0
      }

      const nextSeen = new Set(seen)
      nextSeen.add(questionId)

      const explicitAnswer = answers[questionId]
      if (explicitAnswer !== undefined) {
        const nextId = resolveNext(questionId, extractAnswerValue(explicitAnswer))
        return 1 + countFrom(nextId, nextSeen)
      }

      if ((question.type === 'yes_no' || question.type === 'single_choice') && Array.isArray(question.options)) {
        const branchCounts = question.options.map((option) => {
          const nextId = resolveNext(questionId, option.value)
          return countFrom(nextId, nextSeen)
        })
        const shortestBranch = branchCounts.length > 0 ? Math.min(...branchCounts) : 0
        return 1 + shortestBranch
      }

      const nextId = resolveNext(questionId, getFallbackAnswer(question))
      return 1 + countFrom(nextId, nextSeen)
    }

    return Math.max(countFrom('q0'), 1)
  }, [answers, extractAnswerValue, getFallbackAnswer, questionMap, resolveNext])

  const next = () => {
    if (!currentQuestion) {
      return
    }

    const currentAnswer = answers[currentQuestion.id]
    const target = resolveNext(currentQuestion.id, currentAnswer)

    if (target === 'end_not_relevant') {
      setStatus('end_not_relevant')
      return
    }

    if (target === 'end_no_contact') {
      setStatus('end_no_contact')
      return
    }

    if (!target) {
      setStatus('complete')
      return
    }

    setHistory((prev) => [...prev, currentQuestion.id])
    setCurrentId(target)
  }

  const back = () => {
    if (history.length === 0) {
      return
    }

    const clone = [...history]
    const previousId = clone.pop()
    setHistory(clone)
    setCurrentId(previousId)
  }

  const restart = () => {
    setAnswers({})
    setCurrentId('q0')
    setHistory([])
    setStatus('active')
  }

  const currentStepIndex = history.length + 1
  const progress =
    status === 'active'
      ? Math.min(99, Math.round((history.length / Math.max(projectedTotalSteps, 1)) * 100))
      : 100
  const nextTarget = currentQuestion ? resolveNext(currentQuestion.id, answers[currentQuestion.id]) : null

  return {
    answers,
    currentQuestion,
    status,
    progress,
    currentStepIndex,
    activeQuestionCount: projectedTotalSteps,
    nextTarget,
    updateAnswer,
    next,
    back,
    restart,
    canGoBack: history.length > 0,
  }
}
