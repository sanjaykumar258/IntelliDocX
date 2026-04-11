import { Response } from 'express';
import * as hrService from '../services/hrService';
import prisma from '../utils/prisma';

export const getEmployees = async (req: any, res: Response) => {
  try { res.json(await hrService.listEmployees(req.user.organizationId)); }
  catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const getEmployeeById = async (req: any, res: Response) => {
  try {
    const emp = await hrService.getEmployeeById(req.params.id);
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    res.json(emp);
  } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const updateEmployee = async (req: any, res: Response) => {
  try { res.json(await hrService.updateEmployee(req.params.id, req.body)); }
  catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const getHrDocuments = async (req: any, res: Response) => {
  try {
    const { hrDocType, employeeId } = req.query;
    res.json(await hrService.listHrDocuments(req.user.organizationId, { hrDocType: hrDocType as string, employeeId: employeeId as string }));
  } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const createHrDocument = async (req: any, res: Response) => {
  try { res.status(201).json(await hrService.createHrDocument({ ...req.body, organizationId: req.user.organizationId })); }
  catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const signDocument = async (req: any, res: Response) => {
  try { res.json(await hrService.signHrDocument(req.params.id, req.user.userId)); }
  catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const getOnboarding = async (req: any, res: Response) => {
  try { res.json(await hrService.listOnboarding(req.user.organizationId)); }
  catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const createOnboarding = async (req: any, res: Response) => {
  try { res.status(201).json(await hrService.createOnboarding({ ...req.body, organizationId: req.user.organizationId })); }
  catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const updateOnboardingTask = async (req: any, res: Response) => {
  try { res.json(await hrService.updateOnboardingTask(req.params.id, req.body)); }
  catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const getAnnouncements = async (req: any, res: Response) => {
  try { res.json(await hrService.listAnnouncements(req.user.organizationId)); }
  catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const createAnnouncement = async (req: any, res: Response) => {
  try {
    const { title, body, visibleTo, expiresAt } = req.body;
    if (!title || !body) return res.status(400).json({ message: 'Title and body are required' });
    const ann = await hrService.createAnnouncement({
      title, body, visibleTo, expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      createdById: req.user.userId,
      organizationId: req.user.organizationId,
    });
    res.status(201).json(ann);
  } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const getLeaveRequests = async (req: any, res: Response) => {
  try {
    const user = req.user;
    let employeeId: string | undefined;
    if (!['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user.role)) {
      const emp = await prisma.hrEmployee.findUnique({ where: { userId: user.userId } });
      if (emp) employeeId = emp.id; else return res.json([]);
    }
    res.json(await hrService.listLeaveRequests(user.organizationId, employeeId));
  } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const createLeaveRequest = async (req: any, res: Response) => {
  try {
    const emp = await prisma.hrEmployee.findUnique({ where: { userId: req.user.userId } });
    if (!emp) return res.status(400).json({ message: 'No HR employee record found. Contact HR.' });
    const { leaveType, fromDate, toDate, reason } = req.body;
    const leave = await hrService.createLeaveRequest({
      employeeId: emp.id, leaveType,
      fromDate: new Date(fromDate), toDate: new Date(toDate), reason,
      organizationId: req.user.organizationId,
    });
    res.status(201).json(leave);
  } catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const approveLeave = async (req: any, res: Response) => {
  try { res.json(await hrService.approveLeave(req.params.id, req.user.userId)); }
  catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const rejectLeave = async (req: any, res: Response) => {
  try { res.json(await hrService.rejectLeave(req.params.id, req.user.userId)); }
  catch (error: any) { res.status(500).json({ message: error.message }); }
};

export const getHrStats = async (req: any, res: Response) => {
  try { res.json(await hrService.getHrStats(req.user.organizationId)); }
  catch (error: any) { res.status(500).json({ message: error.message }); }
};
