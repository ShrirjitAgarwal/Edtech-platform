const mongoose = require("mongoose");

const schoolComplianceAcceptanceSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true
    },
    schoolCode: {
      type: String,
      default: "",
      index: true
    },
    schoolName: {
      type: String,
      default: ""
    },
    acceptedByUserId: {
      type: String,
      required: true,
      index: true
    },
    acceptedByName: {
      type: String,
      default: ""
    },
    acceptedByEmail: {
      type: String,
      default: ""
    },
    acceptedByRole: {
      type: String,
      default: ""
    },
    acceptedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    agreementVersion: {
      type: String,
      required: true,
      default: "v1.0"
    },
    privacyPolicyVersion: {
      type: String,
      required: true,
      default: "v1.0"
    },
    termsVersion: {
      type: String,
      required: true,
      default: "v1.0"
    },
    dpaVersion: {
      type: String,
      required: true,
      default: "v1.0"
    },
    studentDataNoticeVersion: {
      type: String,
      required: true,
      default: "v1.0"
    },
    retentionPolicyVersion: {
      type: String,
      required: true,
      default: "v1.0"
    },
    confirmations: {
      reviewedPrivacyPolicy: {
        type: Boolean,
        required: true,
        default: false
      },
      reviewedTerms: {
        type: Boolean,
        required: true,
        default: false
      },
      reviewedDpa: {
        type: Boolean,
        required: true,
        default: false
      },
      reviewedStudentDataNotice: {
        type: Boolean,
        required: true,
        default: false
      },
      reviewedRetentionPolicy: {
        type: Boolean,
        required: true,
        default: false
      },
      schoolAuthorizedForStudentData: {
        type: Boolean,
        required: true,
        default: false
      },
      schoolHandlesParentGuardianPermissions: {
        type: Boolean,
        required: true,
        default: false
      },
      academicUseOnly: {
        type: Boolean,
        required: true,
        default: false
      },
      deletionExportViaAuthorizedSchoolAdmin: {
        type: Boolean,
        required: true,
        default: false
      }
    },
    requestIp: {
      type: String,
      default: ""
    },
    userAgent: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

schoolComplianceAcceptanceSchema.index({
  schoolId: 1,
  acceptedAt: -1
});

module.exports =
  mongoose.models.SchoolComplianceAcceptance ||
  mongoose.model("SchoolComplianceAcceptance", schoolComplianceAcceptanceSchema);
