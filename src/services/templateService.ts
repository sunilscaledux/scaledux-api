import * as fs from 'fs';
import * as path from 'path';
import mailConfig from '@config/mail';

export interface TemplateVariables {
  [key: string]: string | number | boolean;
}

/** Layout variables filled from env when using base layout (so {{HEADER_TITLE}}, {{FOOTER_MESSAGE}}, etc. are never raw) */
function getLayoutDefaultsFromEnv(variables: TemplateVariables): TemplateVariables {
  return {
    COMPANY_NAME: mailConfig.COMPANY_NAME,
    FOOTER_MESSAGE: mailConfig.FOOTER_MESSAGE,
    FOOTER_NOTE: mailConfig.FOOTER_NOTE,
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
        const layoutDefaults = getLayoutDefaultsFromEnv(variables);
        const layoutVariables = {
          ...layoutDefaults,
          ...variables,
          CONTENT: templateContent
        };
        return this.replaceVariables(layoutContent, layoutVariables);
      }

      return templateContent;
    } catch (error) {
      console.error('Error compiling template:', error);
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
        console.warn(`Template variable not found: ${variableName}`);
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
    companyName?: string;
    otpValidity?: number;
  }): Promise<EmailTemplate> {
    const templateVariables: TemplateVariables = {
      TITLE: 'Verify Your Email Address',
      HEADER_TITLE: '📧 Verify Your Email Address',
      FIRST_NAME: variables.firstName || 'there',
      OTP_CODE: variables.otpCode,
      COMPANY_NAME: variables.companyName || 'ScaleDux',
      OTP_VALIDITY: variables.otpValidity || 10,
      FOOTER_MESSAGE: 'Best regards,',
      FOOTER_NOTE: 'This is an automated email. Please do not reply to this message.'
    };

    const html = await this.compileTemplate('otp-verification', templateVariables);
    
    return {
      subject: 'Verify Your Email Address',
      html
    };
  }

  /**
   * Get welcome email template
   */
  async getWelcomeTemplate(variables: {
    firstName: string;
    companyName?: string;
  }): Promise<EmailTemplate> {
    const templateVariables: TemplateVariables = {
      TITLE: `Welcome to ${variables.companyName || 'ScaleDux'}`,
      HEADER_TITLE: `🎉 Welcome to ${variables.companyName || 'ScaleDux'}!`,
      FIRST_NAME: variables.firstName,
      COMPANY_NAME: variables.companyName || 'ScaleDux',
      FOOTER_MESSAGE: 'Welcome aboard!',
      FOOTER_NOTE: 'This is an automated email. Please do not reply to this message.'
    };

    const html = await this.compileTemplate('welcome', templateVariables);
    
    return {
      subject: `Welcome to ${variables.companyName || 'ScaleDux'}!`,
      html
    };
  }

  /**
   * Get password reset email template
   */
  async getPasswordResetTemplate(variables: {
    OTP_CODE: string;
    companyName?: string;
    linkValidity?: number;
  }): Promise<EmailTemplate> {
    const templateVariables: TemplateVariables = {
      TITLE: 'Reset Your Password',
      HEADER_TITLE: '🔐 Reset Your Password',
      OTP_CODE: variables.OTP_CODE,
      COMPANY_NAME: variables.companyName || 'ScaleDux',
      LINK_VALIDITY: variables.linkValidity || 10,
      FOOTER_MESSAGE: 'Best regards,',
      FOOTER_NOTE: 'This is an automated email. Please do not reply to this message.'
    };

    const html = await this.compileTemplate('password-reset', templateVariables);
    
    return {
      subject: 'Reset Your Password',
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
      console.error('Error reading templates directory:', error);
      return [];
    }
  }
}

export const templateService = new TemplateService();
