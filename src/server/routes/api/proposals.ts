import { Hono } from 'hono';
import type { StructureProposal } from '../../../shared/types.js';
import { deleteProposal, getProposal, listProposals, saveProposal } from '../../core/db.js';
import { executeMergeProposal } from '../../core/merge.js';
import { executeSplitProposal } from '../../core/split.js';

export const proposalsRouter = new Hono();

proposalsRouter.get('/', async (c) => {
  const proposals = await listProposals();
  return c.json<StructureProposal[]>(proposals);
});

proposalsRouter.post('/:id/approve', async (c) => {
  const proposal = await getProposal(c.req.param('id'));
  if (!proposal) return c.json({ error: 'Not found' }, 404);

  if (proposal.kind === 'merge') {
    const result = await executeMergeProposal(proposal);
    if (!result) {
      return c.json(
        { error: 'Merge failed — need at least two active articles' },
        400
      );
    }
    const updated: StructureProposal = { ...proposal, status: 'approved' };
    await saveProposal(updated);
    return c.json({
      proposal: updated,
      mergedArticle: result.canonical,
      mergedCount: result.mergedCount,
    });
  }

  if (proposal.kind === 'split') {
    const result = await executeSplitProposal(proposal);
    if (!result) {
      return c.json(
        { error: 'Split failed — need one active article with a valid split plan' },
        400
      );
    }
    const updated: StructureProposal = { ...proposal, status: 'approved' };
    await saveProposal(updated);
    return c.json({
      proposal: updated,
      splitArticles: result.created,
      archivedArticleId: result.archivedId,
    });
  }

  const updated: StructureProposal = { ...proposal, status: 'approved' };
  await saveProposal(updated);
  return c.json({ proposal: updated });
});

proposalsRouter.post('/:id/reject', async (c) => {
  const proposal = await getProposal(c.req.param('id'));
  if (!proposal) return c.json({ error: 'Not found' }, 404);
  const updated: StructureProposal = { ...proposal, status: 'rejected' };
  await saveProposal(updated);
  return c.json<StructureProposal>(updated);
});

proposalsRouter.delete('/:id', async (c) => {
  await deleteProposal(c.req.param('id'));
  return c.json({ ok: true });
});
