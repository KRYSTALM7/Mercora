"""Scheduler Tasks"""
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

@scheduler.scheduled_job('cron', hour=9, minute=0)
def daily_workflow_task():
    """Daily workflow task at 09:00 UTC"""
    try:
        logger.info("Running daily workflow task")
        # Add your daily logic here
    except Exception as e:
        logger.error(f"Error in daily workflow: {e}")

@scheduler.scheduled_job('cron', hour=9, minute=30)
def daily_email_task():
    """Daily email task at 09:30 UTC"""
    try:
        logger.info("Running daily email task")
        # Add your email logic here
    except Exception as e:
        logger.error(f"Error in daily email: {e}")

def start_scheduler():
    """Start the scheduler"""
    try:
        if not scheduler.running:
            scheduler.start()
            logger.info("Scheduler started")
    except Exception as e:
        logger.error(f"Error starting scheduler: {e}")

def stop_scheduler():
    """Stop the scheduler"""
    try:
        if scheduler.running:
            scheduler.shutdown()
            logger.info("Scheduler stopped")
    except Exception as e:
        logger.error(f"Error stopping scheduler: {e}")
