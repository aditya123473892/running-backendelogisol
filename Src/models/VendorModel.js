const { pool, sql } = require("../config/dbconfig");

class VendorModel {
  // Get all vendors
  static async getAll() {
    try {
      const result = await pool.request().query(`
        SELECT * FROM VENDOR_MASTER
        ORDER BY VENDOR_NAME
      `);
      return result.recordset;
    } catch (error) {
      console.error("Get all vendors error:", error);
      throw error;
    }
  }

  // Get vendor by ID
  static async getById(vendorId) {
    try {
      const result = await pool
        .request()
        .input("vendor_id", sql.Numeric(10, 0), vendorId)
        .query(`
          SELECT * FROM VENDOR_MASTER
          WHERE VENDOR_ID = @vendor_id
        `);

      return result.recordset[0] || null;
    } catch (error) {
      console.error("Get vendor by ID error:", error);
      throw error;
    }
  }

  // Create a new vendor
  static async create(data) {
    try {
      const {
        terminal_id,
        vendor_code,
        vendor_name,
        address,
        city,
        pin_code,
        state_code,
        country,
        email_id1,
        email_id2,
        contact_no,
        mobile_no,
        fax,
        payment_terms,
        pan,
        tan,
        service_tax_reg,
        bank_name,
        ac_map_code,
        account_no,
        ifsc,
        bank_branch,
        gstin
      } = data;

      const result = await pool
        .request()
        .input("terminal_id", sql.Numeric(10, 0), terminal_id)
        .input("vendor_code", sql.NVarChar(10), vendor_code)
        .input("vendor_name", sql.NVarChar(100), vendor_name)
        .input("address", sql.NVarChar(100), address)
        .input("city", sql.NVarChar(100), city)
        .input("pin_code", sql.NVarChar(10), pin_code)
        .input("state_code", sql.NVarChar(100), state_code)
        .input("country", sql.NVarChar(20), country || 'India')
        .input("email_id1", sql.NVarChar(50), email_id1)
        .input("email_id2", sql.NVarChar(50), email_id2)
        .input("contact_no", sql.NVarChar(50), contact_no)
        .input("mobile_no", sql.NVarChar(50), mobile_no)
        .input("fax", sql.NVarChar(50), fax)
        .input("payment_terms", sql.NVarChar(1), payment_terms)
        .input("pan", sql.NVarChar(50), pan)
        .input("tan", sql.NVarChar(50), tan)
        .input("service_tax_reg", sql.NVarChar(50), service_tax_reg)
        .input("bank_name", sql.NVarChar(50), bank_name)
        .input("ac_map_code", sql.NVarChar(20), ac_map_code)
        .input("created_by", sql.NVarChar(30), 'SYSTEM')
        .input("account_no", sql.NVarChar(30), account_no)
        .input("ifsc", sql.NVarChar(20), ifsc)
        .input("bank_branch", sql.NVarChar(30), bank_branch)
        .input("gstin", sql.NVarChar(30), gstin)
        .query(`
          INSERT INTO VENDOR_MASTER (
            TERMINAL_ID, VENDOR_CODE, VENDOR_NAME, ADDRESS, CITY, PIN_CODE, STATE_CODE, COUNTRY,
            EMAIL_ID1, EMAIL_ID2, CONTACT_NO, MOBILE_NO, FAX, PAYMENT_TERMS, PAN, TAN,
            SERVICE_TAX_REG, BANK_NAME, AC_MAP_CODE, CREATED_BY, CREATED_ON, ACCOUNT_NO,
            IFSC, BANK_BRANCH, GSTIN
          )
          VALUES (
            @terminal_id, @vendor_code, @vendor_name, @address, @city, @pin_code, @state_code, @country,
            @email_id1, @email_id2, @contact_no, @mobile_no, @fax, @payment_terms, @pan, @tan,
            @service_tax_reg, @bank_name, @ac_map_code, @created_by, GETDATE(), @account_no,
            @ifsc, @bank_branch, @gstin
          );
          
          SELECT SCOPE_IDENTITY() AS vendor_id;
        `);

      return { success: true, vendor_id: result.recordset[0].vendor_id };
    } catch (error) {
      console.error("Create vendor error:", error);
      throw error;
    }
  }

  // Update vendor
  static async update(vendorId, data) {
    try {
      const {
        terminal_id,
        vendor_code,
        vendor_name,
        address,
        city,
        pin_code,
        state_code,
        country,
        email_id1,
        email_id2,
        contact_no,
        mobile_no,
        fax,
        payment_terms,
        pan,
        tan,
        service_tax_reg,
        bank_name,
        ac_map_code,
        account_no,
        ifsc,
        bank_branch,
        gstin
      } = data;

      await pool
        .request()
        .input("vendor_id", sql.Numeric(10, 0), vendorId)
        .input("terminal_id", sql.Numeric(10, 0), terminal_id)
        .input("vendor_code", sql.NVarChar(10), vendor_code)
        .input("vendor_name", sql.NVarChar(100), vendor_name)
        .input("address", sql.NVarChar(100), address)
        .input("city", sql.NVarChar(100), city)
        .input("pin_code", sql.NVarChar(10), pin_code)
        .input("state_code", sql.NVarChar(100), state_code)
        .input("country", sql.NVarChar(20), country)
        .input("email_id1", sql.NVarChar(50), email_id1)
        .input("email_id2", sql.NVarChar(50), email_id2)
        .input("contact_no", sql.NVarChar(50), contact_no)
        .input("mobile_no", sql.NVarChar(50), mobile_no)
        .input("fax", sql.NVarChar(50), fax)
        .input("payment_terms", sql.NVarChar(1), payment_terms)
        .input("pan", sql.NVarChar(50), pan)
        .input("tan", sql.NVarChar(50), tan)
        .input("service_tax_reg", sql.NVarChar(50), service_tax_reg)
        .input("bank_name", sql.NVarChar(50), bank_name)
        .input("ac_map_code", sql.NVarChar(20), ac_map_code)
        .input("updated_by", sql.NVarChar(30), 'SYSTEM')
        .input("account_no", sql.NVarChar(30), account_no)
        .input("ifsc", sql.NVarChar(20), ifsc)
        .input("bank_branch", sql.NVarChar(30), bank_branch)
        .input("gstin", sql.NVarChar(30), gstin)
        .query(`
          UPDATE VENDOR_MASTER
          SET 
            TERMINAL_ID = @terminal_id,
            VENDOR_CODE = @vendor_code,
            VENDOR_NAME = @vendor_name,
            ADDRESS = @address,
            CITY = @city,
            PIN_CODE = @pin_code,
            STATE_CODE = @state_code,
            COUNTRY = @country,
            EMAIL_ID1 = @email_id1,
            EMAIL_ID2 = @email_id2,
            CONTACT_NO = @contact_no,
            MOBILE_NO = @mobile_no,
            FAX = @fax,
            PAYMENT_TERMS = @payment_terms,
            PAN = @pan,
            TAN = @tan,
            SERVICE_TAX_REG = @service_tax_reg,
            BANK_NAME = @bank_name,
            AC_MAP_CODE = @ac_map_code,
            UPDATED_BY = @updated_by,
            UPDATED_ON = GETDATE(),
            ACCOUNT_NO = @account_no,
            IFSC = @ifsc,
            BANK_BRANCH = @bank_branch,
            GSTIN = @gstin
          WHERE VENDOR_ID = @vendor_id
        `);

      return { success: true };
    } catch (error) {
      console.error("Update vendor error:", error);
      throw error;
    }
  }

  // Delete vendor
  static async delete(vendorId) {
    try {
      await pool
        .request()
        .input("vendor_id", sql.Numeric(10, 0), vendorId)
        .query(`
          DELETE FROM VENDOR_MASTER WHERE VENDOR_ID = @vendor_id
        `);

      return { success: true };
    } catch (error) {
      console.error("Delete vendor error:", error);
      throw error;
    }
  }
}

module.exports = VendorModel;