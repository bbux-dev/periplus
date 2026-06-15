import { useLiveQuery } from 'dexie-react-hooks'
import { PlusIcon, MinusIcon } from '@heroicons/react/24/outline'
import { db } from '../services/db'
import { Button } from './ui/Button'

export function Counter() {
  // Third arg = default while Dexie is opening — avoids undefined flash (Pitfall 5)
  const counter = useLiveQuery(
    () => db.counter.get(1),
    [],
    { id: 1, value: 0 },
  )

  const value = counter?.value ?? 0

  const increment = () => db.counter.put({ id: 1, value: value + 1 })
  const decrement = () => db.counter.put({ id: 1, value: value - 1 })

  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="icon" onClick={decrement} aria-label="decrement">
        <MinusIcon className="h-5 w-5" />
      </Button>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <Button variant="ghost" size="icon" onClick={increment} aria-label="increment">
        <PlusIcon className="h-5 w-5" />
      </Button>
    </div>
  )
}
