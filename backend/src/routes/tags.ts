import { Router } from 'express'
import * as tagController from '../controllers/tagController'

const router = Router()

router.get('/', tagController.getAll)
router.get('/:id', tagController.getOne)
router.post('/', tagController.create)
router.put('/:id', tagController.update)
router.delete('/:id', tagController.remove)
router.post('/recalculate-counts', tagController.recalculateCounts)

export default router
