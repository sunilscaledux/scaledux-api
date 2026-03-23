import * as fs from 'fs';
import * as path from 'path';
import mailConfig from '@config/mail';
import { Log } from '@services/loggerService';

export interface TemplateVariables {
  [key: string]: string | number | boolean;
}

/** Layout variables filled when using base layout (so {{HEADER_TITLE}} is never raw) */
function getLayoutDefaults(variables: TemplateVariables): TemplateVariables {
  return {
    COMPANY_NAME: mailConfig.COMPANY_NAME,
    HEADER_TITLE: variables.HEADER_TITLE ?? variables.TITLE ?? 'Notification',
  };
}

export interface EmailTemplate {
  subject: string;
  html: string;
}

class TemplateService {
  private templatesPath: string;
  private baseLayoutPath: string;

  constructor() {
    this.templatesPath = path.join(__dirname, '../templates');
    this.baseLayoutPath = path.join(this.templatesPath, 'base', 'layout.html');
  }

  /**
   * Load and compile email template with variables
   */
  async compileTemplate(
    templateName: string, 
    variables: TemplateVariables,
    useLayout: boolean = true
  ): Promise<string> {
    try {
      const templatePath = path.join(this.templatesPath, 'emails', `${templateName}.html`);
      // Check if template exists
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found: ${templateName}`);
      }

      // Read template content
      let templateContent = fs.readFileSync(templatePath, 'utf8');
      
      // Replace variables in template content
      templateContent = this.replaceVariables(templateContent, variables);

      // If using layout, wrap content in base layout (layout vars from env so {{HEADER_TITLE}}, {{FOOTER_MESSAGE}}, etc. are always replaced)
      if (useLayout) {
        const layoutContent = fs.readFileSync(this.baseLayoutPath, 'utf8');
        const layoutDefaults = getLayoutDefaults(variables);
        const layoutVariables = {
          ...layoutDefaults,
          ...variables,
          CONTENT: templateContent
        };
        return this.replaceVariables(layoutContent, layoutVariables);
      }

      return templateContent;
    } catch (error) {
      Log.error('Error compiling template', { error, templateName });
      throw new Error(`Failed to compile template: ${templateName}`);
    }
  }

  /**
   * Replace variables in template using regex
   * Variables should be in format {{VARIABLE_NAME}}
   */
  private replaceVariables(template: string, variables: TemplateVariables): string {
    return template.replace(/\{\{([A-Z_]+)\}\}/g, (match, variableName) => {
      const value = variables[variableName];
      
      // Handle different data types
      if (value === undefined || value === null) {
        Log.warn(`Template variable not found: ${variableName}`);
        return match; // Keep original placeholder if variable not found
      }
      
      return String(value);
    });
  }

  /**
   * Get OTP email template
   */
  async getOtpTemplate(variables: {
    firstName?: string;
    otpCode: string;
    otpValidity?: number;
    subject?: string;
  }): Promise<EmailTemplate> {
    const subject = variables.subject || 'Your Verification Code';
    const templateVariables: TemplateVariables = {
      TITLE: subject,
      HEADER_TITLE: subject,
      FIRST_NAME: variables.firstName || 'there',
      OTP_CODE: variables.otpCode,
      OTP_VALIDITY: variables.otpValidity || 10,
    };

    const html = await this.compileTemplate('otp-verification', templateVariables);

    return { subject, html };
  }

  /**
   * Get welcome email template
   */
  async getWelcomeTemplate(variables: {
    firstName: string;
  }): Promise<EmailTemplate> {
    const templateVariables: TemplateVariables = {
      TITLE: `Welcome to ${mailConfig.APP_NAME}`,
      HEADER_TITLE: `Welcome to ${mailConfig.APP_NAME}!`,
      FIRST_NAME: variables.firstName,
    };

    const html = await this.compileTemplate('welcome', templateVariables);

    return {
      subject: `Welcome to ${mailConfig.APP_NAME}!`,
      html
    };
  }



  /**
   * Get custom template with variables
   */
  async getCustomTemplate(
    templateName: string,
    variables: TemplateVariables,
    subject: string,
    useLayout: boolean = true
  ): Promise<EmailTemplate> {
    const html = await this.compileTemplate(templateName, variables, useLayout);
    
    return {
      subject,
      html
    };
  }

  /**
   * List available templates
   */
  getAvailableTemplates(): string[] {
    try {
      const emailsPath = path.join(this.templatesPath, 'emails');
      const files = fs.readdirSync(emailsPath);
      return files
        .filter(file => file.endsWith('.html'))
        .map(file => file.replace('.html', ''));
    } catch (error) {
      Log.error('Error reading templates directory', { error });
      return [];
    }
  }
}

export const templateService = new TemplateService();
