import type * as HttpClient from "effect/unstable/http/HttpClient";
import type * as redacted from "effect/Redacted";
import * as API from "@distilled.cloud/core/api";
import * as D from "@distilled.cloud/core/shape";
import * as TE from "@distilled.cloud/core/error-class";
import { AwsProtocol } from "../protocol.ts";
import { restJson1Protocol } from "../protocols/rest-json.ts";
import { Retry } from "../retry.ts";
import type * as T from "../types.ts";
import type { Credentials } from "../credentials.ts";
import type { CommonErrors } from "../errors.ts";
const svc: T.ServiceInfo = {
  sdkId: "AmplifyUIBuilder",
  target: "AmplifyUIBuilder",
  version: "2021-08-11",
  sigv4: "amplifyuibuilder",
  protocol: restJson1Protocol,
  rules: (p, _) => {
    const { Region, UseDualStack = false, UseFIPS = false, Endpoint } = p;
    const e = (u: unknown, p = {}, h = {}): T.EndpointResolverResult => ({
      type: "endpoint" as const,
      endpoint: { url: u as string, properties: p, headers: h },
    });
    const err = (m: unknown): T.EndpointResolverResult => ({
      type: "error" as const,
      message: m as string,
    });
    if (Endpoint != null) {
      if (UseFIPS === true) {
        return err(
          "Invalid Configuration: FIPS and custom endpoint are not supported",
        );
      }
      if (UseDualStack === true) {
        return err(
          "Invalid Configuration: Dualstack and custom endpoint are not supported",
        );
      }
      return e(Endpoint);
    }
    if (Region != null) {
      {
        const PartitionResult = _.partition(Region);
        if (PartitionResult != null && PartitionResult !== false) {
          if (UseFIPS === true && UseDualStack === true) {
            if (
              true === _.getAttr(PartitionResult, "supportsFIPS") &&
              true === _.getAttr(PartitionResult, "supportsDualStack")
            ) {
              return e(
                `https://amplifyuibuilder-fips.${Region}.${_.getAttr(PartitionResult, "dualStackDnsSuffix")}`,
              );
            }
            return err(
              "FIPS and DualStack are enabled, but this partition does not support one or both",
            );
          }
          if (UseFIPS === true) {
            if (_.getAttr(PartitionResult, "supportsFIPS") === true) {
              return e(
                `https://amplifyuibuilder-fips.${Region}.${_.getAttr(PartitionResult, "dnsSuffix")}`,
              );
            }
            return err(
              "FIPS is enabled but this partition does not support FIPS",
            );
          }
          if (UseDualStack === true) {
            if (true === _.getAttr(PartitionResult, "supportsDualStack")) {
              return e(
                `https://amplifyuibuilder.${Region}.${_.getAttr(PartitionResult, "dualStackDnsSuffix")}`,
              );
            }
            return err(
              "DualStack is enabled but this partition does not support DualStack",
            );
          }
          return e(
            `https://amplifyuibuilder.${Region}.${_.getAttr(PartitionResult, "dnsSuffix")}`,
          );
        }
      }
    }
    return err("Invalid Configuration: Missing Region");
  },
};

export class InternalServerException
  extends /*@__PURE__*/ TE.TaggedError(
    "InternalServerException",
    ["ServerError"],
    { status: 500 },
  )<{ readonly message?: string }> {}
export class InvalidParameterException
  extends /*@__PURE__*/ TE.TaggedError(
    "InvalidParameterException",
    ["BadRequestError"],
    { status: 400 },
  )<{ readonly message?: string }> {}
export class ResourceConflictException
  extends /*@__PURE__*/ TE.TaggedError(
    "ResourceConflictException",
    ["ConflictError"],
    { status: 409 },
  )<{ readonly message?: string }> {}
export class ResourceNotFoundException
  extends /*@__PURE__*/ TE.TaggedError(
    "ResourceNotFoundException",
    ["BadRequestError"],
    { status: 404 },
  )<{ readonly message?: string }> {}
export class ServiceQuotaExceededException
  extends /*@__PURE__*/ TE.TaggedError(
    "ServiceQuotaExceededException",
    ["QuotaError"],
    { status: 402 },
  )<{ readonly message?: string }> {}
export class ThrottlingException
  extends /*@__PURE__*/ TE.TaggedError(
    "ThrottlingException",
    ["ThrottlingError"],
    { status: 429 },
  )<{ readonly message?: string }> {}
export class UnauthorizedException
  extends /*@__PURE__*/ TE.TaggedError("UnauthorizedException", ["AuthError"], {
    status: 401,
  })<{ readonly message?: string }> {}
export type ComponentName = string;
export type ComponentType = string;
export interface ComponentPropertyBindingProperties {
  property: string;
  field?: string;
}
export interface FormBindingElement {
  element: string;
  property: string;
}
export type FormBindings = { [key: string]: FormBindingElement | undefined };
export type ComponentPropertyList = ComponentProperty[];
export interface ComponentConditionProperty {
  property?: string;
  field?: string;
  operator?: string;
  operand?: string;
  then?: ComponentProperty;
  else?: ComponentProperty;
  operandType?: string;
}
export interface ComponentProperty {
  value?: string;
  bindingProperties?: ComponentPropertyBindingProperties;
  collectionBindingProperties?: ComponentPropertyBindingProperties;
  defaultValue?: string;
  model?: string;
  bindings?: { [key: string]: FormBindingElement | undefined };
  event?: string;
  userAttribute?: string;
  concat?: ComponentProperty[];
  condition?: ComponentConditionProperty;
  configured?: boolean;
  type?: string;
  importedValue?: string;
  componentName?: string;
  property?: string;
}
export type ComponentProperties = {
  [key: string]: ComponentProperty | undefined;
};
export interface MutationActionSetStateParameter {
  componentName: string;
  property: string;
  set: ComponentProperty;
}
export interface ActionParameters {
  type?: ComponentProperty;
  url?: ComponentProperty;
  anchor?: ComponentProperty;
  target?: ComponentProperty;
  global?: ComponentProperty;
  model?: string;
  id?: ComponentProperty;
  fields?: { [key: string]: ComponentProperty | undefined };
  state?: MutationActionSetStateParameter;
}
export interface ComponentEvent {
  action?: string;
  parameters?: ActionParameters;
  bindingEvent?: string;
}
export type ComponentEvents = { [key: string]: ComponentEvent | undefined };
export interface ComponentChild {
  componentType: string;
  name: string;
  properties: { [key: string]: ComponentProperty | undefined };
  children?: ComponentChild[];
  events?: { [key: string]: ComponentEvent | undefined };
  sourceId?: string;
}
export type ComponentChildList = ComponentChild[];
export type ComponentVariantValues = { [key: string]: string | undefined };
export type ComponentOverridesValue = { [key: string]: string | undefined };
export type ComponentOverrides = {
  [key: string]: { [key: string]: string | undefined } | undefined;
};
export interface ComponentVariant {
  variantValues?: { [key: string]: string | undefined };
  overrides?: {
    [key: string]: { [key: string]: string | undefined } | undefined;
  };
}
export type ComponentVariants = ComponentVariant[];
export type OperandType = string;
export interface Predicate {
  or?: Predicate[];
  and?: Predicate[];
  field?: string;
  operator?: string;
  operand?: string;
  operandType?: string;
}
export type PredicateList = Predicate[];
export interface ComponentBindingPropertiesValueProperties {
  model?: string;
  field?: string;
  predicates?: Predicate[];
  userAttribute?: string;
  bucket?: string;
  key?: string;
  defaultValue?: string;
  slotName?: string;
}
export interface ComponentBindingPropertiesValue {
  type?: string;
  bindingProperties?: ComponentBindingPropertiesValueProperties;
  defaultValue?: string;
}
export type ComponentBindingProperties = {
  [key: string]: ComponentBindingPropertiesValue | undefined;
};
export type SortDirection = "ASC" | "DESC" | (string & {});
export interface SortProperty {
  field: string;
  direction: SortDirection;
}
export type SortPropertyList = SortProperty[];
export type IdentifierList = string[];
export interface ComponentDataConfiguration {
  model: string;
  sort?: SortProperty[];
  predicate?: Predicate;
  identifiers?: string[];
}
export type ComponentCollectionProperties = {
  [key: string]: ComponentDataConfiguration | undefined;
};
export type TagKey = string;
export type TagValue = string;
export type Tags = { [key: string]: string | undefined };
export interface CreateComponentData {
  name: string;
  sourceId?: string;
  componentType: string;
  properties: { [key: string]: ComponentProperty | undefined };
  children?: ComponentChild[];
  variants: ComponentVariant[];
  overrides: {
    [key: string]: { [key: string]: string | undefined } | undefined;
  };
  bindingProperties: {
    [key: string]: ComponentBindingPropertiesValue | undefined;
  };
  collectionProperties?: {
    [key: string]: ComponentDataConfiguration | undefined;
  };
  tags?: { [key: string]: string | undefined };
  events?: { [key: string]: ComponentEvent | undefined };
  schemaVersion?: string;
}
export interface CreateComponentRequest {
  appId: string;
  environmentName: string;
  clientToken?: string;
  componentToCreate: CreateComponentData;
}
export type Uuid = string;
export interface Component {
  appId: string;
  environmentName: string;
  sourceId?: string;
  id: string;
  name: string;
  componentType: string;
  properties: { [key: string]: ComponentProperty | undefined };
  children?: ComponentChild[];
  variants: ComponentVariant[];
  overrides: {
    [key: string]: { [key: string]: string | undefined } | undefined;
  };
  bindingProperties: {
    [key: string]: ComponentBindingPropertiesValue | undefined;
  };
  collectionProperties?: {
    [key: string]: ComponentDataConfiguration | undefined;
  };
  createdAt: Date;
  modifiedAt?: Date;
  tags?: { [key: string]: string | undefined };
  events?: { [key: string]: ComponentEvent | undefined };
  schemaVersion?: string;
}
export interface CreateComponentResponse {
  entity?: Component;
}
export type FormName = string;
export type FormDataSourceType = string;
export interface FormDataTypeConfig {
  dataSourceType: string;
  dataTypeName: string;
}
export type FormActionType = "create" | "update" | (string & {});
export type FixedPosition = "first" | (string & {});
export type FieldPosition =
  | { fixed: FixedPosition; rightOf?: never; below?: never }
  | { fixed?: never; rightOf: string; below?: never }
  | { fixed?: never; rightOf?: never; below: string };
export interface FormInputValuePropertyBindingProperties {
  property: string;
  field?: string;
}
export type FormInputValuePropertyList = FormInputValueProperty[];
export interface FormInputValueProperty {
  value?: string;
  bindingProperties?: FormInputValuePropertyBindingProperties;
  concat?: FormInputValueProperty[];
}
export interface ValueMapping {
  displayValue?: FormInputValueProperty;
  value: FormInputValueProperty;
}
export type ValueMappingList = ValueMapping[];
export interface FormInputBindingPropertiesValueProperties {
  model?: string;
}
export interface FormInputBindingPropertiesValue {
  type?: string;
  bindingProperties?: FormInputBindingPropertiesValueProperties;
}
export type FormInputBindingProperties = {
  [key: string]: FormInputBindingPropertiesValue | undefined;
};
export interface ValueMappings {
  values: ValueMapping[];
  bindingProperties?: {
    [key: string]: FormInputBindingPropertiesValue | undefined;
  };
}
export type StorageAccessLevel =
  | "public"
  | "protected"
  | "private"
  | (string & {});
export type StrValues = string[];
export interface FileUploaderFieldConfig {
  accessLevel: StorageAccessLevel;
  acceptedFileTypes: string[];
  showThumbnails?: boolean;
  isResumable?: boolean;
  maxFileCount?: number;
  maxSize?: number;
}
export interface FieldInputConfig {
  type: string;
  required?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  defaultValue?: string;
  descriptiveText?: string;
  defaultChecked?: boolean;
  defaultCountryCode?: string;
  valueMappings?: ValueMappings;
  name?: string;
  minValue?: number;
  maxValue?: number;
  step?: number;
  value?: string;
  isArray?: boolean;
  fileUploaderConfig?: FileUploaderFieldConfig;
}
export type NumValues = number[];
export interface FieldValidationConfiguration {
  type: string;
  strValues?: string[];
  numValues?: number[];
  validationMessage?: string;
}
export type ValidationsList = FieldValidationConfiguration[];
export interface FieldConfig {
  label?: string;
  position?: FieldPosition;
  excluded?: boolean;
  inputType?: FieldInputConfig;
  validations?: FieldValidationConfiguration[];
}
export type FieldsMap = { [key: string]: FieldConfig | undefined };
export type FormStyleConfig =
  | { tokenReference: string; value?: never }
  | { tokenReference?: never; value: string };
export interface FormStyle {
  horizontalGap?: FormStyleConfig;
  verticalGap?: FormStyleConfig;
  outerPadding?: FormStyleConfig;
}
export interface SectionalElement {
  type: string;
  position?: FieldPosition;
  text?: string;
  level?: number;
  orientation?: string;
  excluded?: boolean;
}
export type SectionalElementMap = {
  [key: string]: SectionalElement | undefined;
};
export type FormButtonsPosition =
  | "top"
  | "bottom"
  | "top_and_bottom"
  | (string & {});
export interface FormButton {
  excluded?: boolean;
  children?: string;
  position?: FieldPosition;
}
export interface FormCTA {
  position?: FormButtonsPosition;
  clear?: FormButton;
  cancel?: FormButton;
  submit?: FormButton;
}
export type LabelDecorator = string;
export interface CreateFormData {
  name: string;
  dataType: FormDataTypeConfig;
  formActionType: FormActionType;
  fields: { [key: string]: FieldConfig | undefined };
  style: FormStyle;
  sectionalElements: { [key: string]: SectionalElement | undefined };
  schemaVersion: string;
  cta?: FormCTA;
  tags?: { [key: string]: string | undefined };
  labelDecorator?: string;
}
export interface CreateFormRequest {
  appId: string;
  environmentName: string;
  clientToken?: string;
  formToCreate: CreateFormData;
}
export interface Form {
  appId: string;
  environmentName: string;
  id: string;
  name: string;
  formActionType: FormActionType;
  style: FormStyle;
  dataType: FormDataTypeConfig;
  fields: { [key: string]: FieldConfig | undefined };
  sectionalElements: { [key: string]: SectionalElement | undefined };
  schemaVersion: string;
  tags?: { [key: string]: string | undefined };
  cta?: FormCTA;
  labelDecorator?: string;
}
export interface CreateFormResponse {
  entity?: Form;
}
export type ThemeName = string;
export interface ThemeValue {
  value?: string;
  children?: ThemeValues[];
}
export interface ThemeValues {
  key?: string;
  value?: ThemeValue;
}
export type ThemeValuesList = ThemeValues[];
export interface CreateThemeData {
  name: string;
  values: ThemeValues[];
  overrides?: ThemeValues[];
  tags?: { [key: string]: string | undefined };
}
export interface CreateThemeRequest {
  appId: string;
  environmentName: string;
  clientToken?: string;
  themeToCreate: CreateThemeData;
}
export interface Theme {
  appId: string;
  environmentName: string;
  id: string;
  name: string;
  createdAt: Date;
  modifiedAt?: Date;
  values: ThemeValues[];
  overrides?: ThemeValues[];
  tags?: { [key: string]: string | undefined };
}
export interface CreateThemeResponse {
  entity?: Theme;
}
export interface DeleteComponentRequest {
  appId: string;
  environmentName: string;
  id: string;
}
export interface DeleteComponentResponse {}
export interface DeleteFormRequest {
  appId: string;
  environmentName: string;
  id: string;
}
export interface DeleteFormResponse {}
export interface DeleteThemeRequest {
  appId: string;
  environmentName: string;
  id: string;
}
export interface DeleteThemeResponse {}
export type TokenProviders = string;
export type SensitiveString = string | redacted.Redacted<string>;
export interface ExchangeCodeForTokenRequestBody {
  code: string | redacted.Redacted<string>;
  redirectUri: string;
  clientId?: string | redacted.Redacted<string>;
}
export interface ExchangeCodeForTokenRequest {
  provider: string;
  request: ExchangeCodeForTokenRequestBody;
}
export interface ExchangeCodeForTokenResponse {
  accessToken: string | redacted.Redacted<string>;
  expiresIn: number;
  refreshToken: string | redacted.Redacted<string>;
}
export interface ExportComponentsRequest {
  appId: string;
  environmentName: string;
  nextToken?: string;
}
export type ComponentList = Component[];
export interface ExportComponentsResponse {
  entities: Component[];
  nextToken?: string;
}
export interface ExportFormsRequest {
  appId: string;
  environmentName: string;
  nextToken?: string;
}
export type FormList = Form[];
export interface ExportFormsResponse {
  entities: Form[];
  nextToken?: string;
}
export interface ExportThemesRequest {
  appId: string;
  environmentName: string;
  nextToken?: string;
}
export type ThemeList = Theme[];
export interface ExportThemesResponse {
  entities: Theme[];
  nextToken?: string;
}
export type AppId = string;
export interface GetCodegenJobRequest {
  appId: string;
  environmentName: string;
  id: string;
}
export type JSModule = "es2020" | "esnext" | (string & {});
export type JSTarget = "es2015" | "es2020" | (string & {});
export type JSScript = "jsx" | "tsx" | "js" | (string & {});
export interface GraphQLRenderConfig {
  typesFilePath: string;
  queriesFilePath: string;
  mutationsFilePath: string;
  subscriptionsFilePath: string;
  fragmentsFilePath: string;
}
export interface DataStoreRenderConfig {}
export interface NoApiRenderConfig {}
export type ApiConfiguration =
  | {
      graphQLConfig: GraphQLRenderConfig;
      dataStoreConfig?: never;
      noApiConfig?: never;
    }
  | {
      graphQLConfig?: never;
      dataStoreConfig: DataStoreRenderConfig;
      noApiConfig?: never;
    }
  | {
      graphQLConfig?: never;
      dataStoreConfig?: never;
      noApiConfig: NoApiRenderConfig;
    };
export type ReactCodegenDependencies = { [key: string]: string | undefined };
export interface ReactStartCodegenJobData {
  module?: JSModule;
  target?: JSTarget;
  script?: JSScript;
  renderTypeDeclarations?: boolean;
  inlineSourceMap?: boolean;
  apiConfiguration?: ApiConfiguration;
  dependencies?: { [key: string]: string | undefined };
}
export type CodegenJobRenderConfig = { react: ReactStartCodegenJobData };
export type CodegenJobGenericDataSourceType = "DataStore" | (string & {});
export type CodegenGenericDataFieldDataType =
  | "ID"
  | "String"
  | "Int"
  | "Float"
  | "AWSDate"
  | "AWSTime"
  | "AWSDateTime"
  | "AWSTimestamp"
  | "AWSEmail"
  | "AWSURL"
  | "AWSIPAddress"
  | "Boolean"
  | "AWSJSON"
  | "AWSPhone"
  | "Enum"
  | "Model"
  | "NonModel"
  | (string & {});
export type GenericDataRelationshipType =
  | "HAS_MANY"
  | "HAS_ONE"
  | "BELONGS_TO"
  | (string & {});
export type RelatedModelFieldsList = string[];
export type AssociatedFieldsList = string[];
export interface CodegenGenericDataRelationshipType {
  type: GenericDataRelationshipType;
  relatedModelName: string;
  relatedModelFields?: string[];
  canUnlinkAssociatedModel?: boolean;
  relatedJoinFieldName?: string;
  relatedJoinTableName?: string;
  belongsToFieldOnRelatedModel?: string;
  associatedFields?: string[];
  isHasManyIndex?: boolean;
}
export interface CodegenGenericDataField {
  dataType: CodegenGenericDataFieldDataType;
  dataTypeValue: string;
  required: boolean;
  readOnly: boolean;
  isArray: boolean;
  relationship?: CodegenGenericDataRelationshipType;
}
export type CodegenGenericDataFields = {
  [key: string]: CodegenGenericDataField | undefined;
};
export type CodegenPrimaryKeysList = string[];
export interface CodegenGenericDataModel {
  fields: { [key: string]: CodegenGenericDataField | undefined };
  isJoinTable?: boolean;
  primaryKeys: string[];
}
export type CodegenGenericDataModels = {
  [key: string]: CodegenGenericDataModel | undefined;
};
export type CodegenGenericDataEnumValuesList = string[];
export interface CodegenGenericDataEnum {
  values: string[];
}
export type CodegenGenericDataEnums = {
  [key: string]: CodegenGenericDataEnum | undefined;
};
export type CodegenGenericDataNonModelFields = {
  [key: string]: CodegenGenericDataField | undefined;
};
export interface CodegenGenericDataNonModel {
  fields: { [key: string]: CodegenGenericDataField | undefined };
}
export type CodegenGenericDataNonModels = {
  [key: string]: CodegenGenericDataNonModel | undefined;
};
export interface CodegenJobGenericDataSchema {
  dataSourceType: CodegenJobGenericDataSourceType;
  models: { [key: string]: CodegenGenericDataModel | undefined };
  enums: { [key: string]: CodegenGenericDataEnum | undefined };
  nonModels: { [key: string]: CodegenGenericDataNonModel | undefined };
}
export interface CodegenFeatureFlags {
  isRelationshipSupported?: boolean;
  isNonModelSupported?: boolean;
}
export type CodegenJobStatus =
  | "in_progress"
  | "failed"
  | "succeeded"
  | (string & {});
export interface CodegenJobAsset {
  downloadUrl?: string;
}
export interface CodegenDependency {
  name?: string;
  supportedVersion?: string;
  isSemVer?: boolean;
  reason?: string;
}
export type CodegenDependencies = CodegenDependency[];
export interface CodegenJob {
  id: string;
  appId: string;
  environmentName: string;
  renderConfig?: CodegenJobRenderConfig;
  genericDataSchema?: CodegenJobGenericDataSchema;
  autoGenerateForms?: boolean;
  features?: CodegenFeatureFlags;
  status?: CodegenJobStatus;
  statusMessage?: string;
  asset?: CodegenJobAsset;
  tags?: { [key: string]: string | undefined };
  createdAt?: Date;
  modifiedAt?: Date;
  dependencies?: CodegenDependency[];
}
export interface GetCodegenJobResponse {
  job?: CodegenJob;
}
export interface GetComponentRequest {
  appId: string;
  environmentName: string;
  id: string;
}
export interface GetComponentResponse {
  component?: Component;
}
export interface GetFormRequest {
  appId: string;
  environmentName: string;
  id: string;
}
export interface GetFormResponse {
  form?: Form;
}
export interface GetMetadataRequest {
  appId: string;
  environmentName: string;
}
export type FeaturesMap = { [key: string]: string | undefined };
export interface GetMetadataResponse {
  features: { [key: string]: string | undefined };
}
export interface GetThemeRequest {
  appId: string;
  environmentName: string;
  id: string;
}
export interface GetThemeResponse {
  theme?: Theme;
}
export type ListCodegenJobsLimit = number;
export interface ListCodegenJobsRequest {
  appId: string;
  environmentName: string;
  nextToken?: string;
  maxResults?: number;
}
export interface CodegenJobSummary {
  appId: string;
  environmentName: string;
  id: string;
  createdAt?: Date;
  modifiedAt?: Date;
}
export type CodegenJobSummaryList = CodegenJobSummary[];
export interface ListCodegenJobsResponse {
  entities: CodegenJobSummary[];
  nextToken?: string;
}
export type ListEntityLimit = number;
export interface ListComponentsRequest {
  appId: string;
  environmentName: string;
  nextToken?: string;
  maxResults?: number;
}
export interface ComponentSummary {
  appId: string;
  environmentName: string;
  id: string;
  name: string;
  componentType: string;
}
export type ComponentSummaryList = ComponentSummary[];
export interface ListComponentsResponse {
  entities: ComponentSummary[];
  nextToken?: string;
}
export interface ListFormsRequest {
  appId: string;
  environmentName: string;
  nextToken?: string;
  maxResults?: number;
}
export interface FormSummary {
  appId: string;
  dataType: FormDataTypeConfig;
  environmentName: string;
  formActionType: FormActionType;
  id: string;
  name: string;
}
export type FormSummaryList = FormSummary[];
export interface ListFormsResponse {
  entities: FormSummary[];
  nextToken?: string;
}
export interface ListTagsForResourceRequest {
  resourceArn: string;
}
export interface ListTagsForResourceResponse {
  tags: { [key: string]: string | undefined };
}
export interface ListThemesRequest {
  appId: string;
  environmentName: string;
  nextToken?: string;
  maxResults?: number;
}
export interface ThemeSummary {
  appId: string;
  environmentName: string;
  id: string;
  name: string;
}
export type ThemeSummaryList = ThemeSummary[];
export interface ListThemesResponse {
  entities: ThemeSummary[];
  nextToken?: string;
}
export interface PutMetadataFlagBody {
  newValue: string;
}
export interface PutMetadataFlagRequest {
  appId: string;
  environmentName: string;
  featureName: string;
  body: PutMetadataFlagBody;
}
export interface PutMetadataFlagResponse {}
export interface RefreshTokenRequestBody {
  token: string | redacted.Redacted<string>;
  clientId?: string | redacted.Redacted<string>;
}
export interface RefreshTokenRequest {
  provider: string;
  refreshTokenBody: RefreshTokenRequestBody;
}
export interface RefreshTokenResponse {
  accessToken: string | redacted.Redacted<string>;
  expiresIn: number;
}
export interface StartCodegenJobData {
  renderConfig: CodegenJobRenderConfig;
  genericDataSchema?: CodegenJobGenericDataSchema;
  autoGenerateForms?: boolean;
  features?: CodegenFeatureFlags;
  tags?: { [key: string]: string | undefined };
}
export interface StartCodegenJobRequest {
  appId: string;
  environmentName: string;
  clientToken?: string;
  codegenJobToCreate: StartCodegenJobData;
}
export interface StartCodegenJobResponse {
  entity?: CodegenJob;
}
export interface TagResourceRequest {
  resourceArn: string;
  tags: { [key: string]: string | undefined };
}
export interface TagResourceResponse {}
export type TagKeyList = string[];
export interface UntagResourceRequest {
  resourceArn: string;
  tagKeys: string[];
}
export interface UntagResourceResponse {}
export interface UpdateComponentData {
  id?: string;
  name?: string;
  sourceId?: string;
  componentType?: string;
  properties?: { [key: string]: ComponentProperty | undefined };
  children?: ComponentChild[];
  variants?: ComponentVariant[];
  overrides?: {
    [key: string]: { [key: string]: string | undefined } | undefined;
  };
  bindingProperties?: {
    [key: string]: ComponentBindingPropertiesValue | undefined;
  };
  collectionProperties?: {
    [key: string]: ComponentDataConfiguration | undefined;
  };
  events?: { [key: string]: ComponentEvent | undefined };
  schemaVersion?: string;
}
export interface UpdateComponentRequest {
  appId: string;
  environmentName: string;
  id: string;
  clientToken?: string;
  updatedComponent: UpdateComponentData;
}
export interface UpdateComponentResponse {
  entity?: Component;
}
export interface UpdateFormData {
  name?: string;
  dataType?: FormDataTypeConfig;
  formActionType?: FormActionType;
  fields?: { [key: string]: FieldConfig | undefined };
  style?: FormStyle;
  sectionalElements?: { [key: string]: SectionalElement | undefined };
  schemaVersion?: string;
  cta?: FormCTA;
  labelDecorator?: string;
}
export interface UpdateFormRequest {
  appId: string;
  environmentName: string;
  id: string;
  clientToken?: string;
  updatedForm: UpdateFormData;
}
export interface UpdateFormResponse {
  entity?: Form;
}
export interface UpdateThemeData {
  id?: string;
  name?: string;
  values: ThemeValues[];
  overrides?: ThemeValues[];
}
export interface UpdateThemeRequest {
  appId: string;
  environmentName: string;
  id: string;
  clientToken?: string;
  updatedTheme: UpdateThemeData;
}
export interface UpdateThemeResponse {
  entity?: Theme;
}
export type CreateComponentError =
  | InternalServerException
  | InvalidParameterException
  | ResourceConflictException
  | ServiceQuotaExceededException
  | CommonErrors;
/**
 * Creates a new component for an Amplify app.
 */
export const createComponent: API.OperationMethod<
  CreateComponentRequest,
  CreateComponentResponse,
  CreateComponentError,
  Credentials | HttpClient.HttpClient
> = /*@__PURE__*/ API.make(() => ({
  descriptor: {
    service: svc,
    http: "POST /app/{appId}/environment/{environmentName}/components",
    input: {
      clientToken: D.m({ query: "clientToken", idempotency: true }),
      componentToCreate: D.m({ payload: true }),
    },
    output: { entity: D.m({ payload: true, shape: o_Component }) },
  },
  errors: [
    InternalServerException,
    InvalidParameterException,
    ResourceConflictException,
    ServiceQuotaExceededException,
  ],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "CreateComponent",
})) as any;

export type CreateFormError =
  | InternalServerException
  | InvalidParameterException
  | ResourceConflictException
  | ServiceQuotaExceededException
  | CommonErrors;
/**
 * Creates a new form for an Amplify app.
 */
export const createForm: API.OperationMethod<
  CreateFormRequest,
  CreateFormResponse,
  CreateFormError,
  Credentials | HttpClient.HttpClient
> = /*@__PURE__*/ API.make(() => ({
  descriptor: {
    service: svc,
    http: "POST /app/{appId}/environment/{environmentName}/forms",
    input: {
      clientToken: D.m({ query: "clientToken", idempotency: true }),
      formToCreate: D.m({ payload: true }),
    },
    output: { entity: D.m({ payload: true }) },
  },
  errors: [
    InternalServerException,
    InvalidParameterException,
    ResourceConflictException,
    ServiceQuotaExceededException,
  ],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "CreateForm",
})) as any;

export type CreateThemeError =
  | InternalServerException
  | InvalidParameterException
  | ResourceConflictException
  | ServiceQuotaExceededException
  | CommonErrors;
/**
 * Creates a theme to apply to the components in an Amplify app.
 */
export const createTheme: API.OperationMethod<
  CreateThemeRequest,
  CreateThemeResponse,
  CreateThemeError,
  Credentials | HttpClient.HttpClient
> = /*@__PURE__*/ API.make(() => ({
  descriptor: {
    service: svc,
    http: "POST /app/{appId}/environment/{environmentName}/themes",
    input: {
      clientToken: D.m({ query: "clientToken", idempotency: true }),
      themeToCreate: D.m({ payload: true }),
    },
    output: { entity: D.m({ payload: true, shape: o_Theme }) },
  },
  errors: [
    InternalServerException,
    InvalidParameterException,
    ResourceConflictException,
    ServiceQuotaExceededException,
  ],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "CreateTheme",
})) as any;

export type DeleteComponentError =
  | InternalServerException
  | InvalidParameterException
  | ResourceNotFoundException
  | CommonErrors;
/**
 * Deletes a component from an Amplify app.
 */
export const deleteComponent: API.OperationMethod<
  DeleteComponentRequest,
  DeleteComponentResponse,
  DeleteComponentError,
  Credentials | HttpClient.HttpClient
> = /*@__PURE__*/ API.make(() => ({
  descriptor: {
    service: svc,
    http: "DELETE /app/{appId}/environment/{environmentName}/components/{id}",
  },
  errors: [
    InternalServerException,
    InvalidParameterException,
    ResourceNotFoundException,
  ],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "DeleteComponent",
})) as any;

export type DeleteFormError =
  | InternalServerException
  | InvalidParameterException
  | ResourceNotFoundException
  | CommonErrors;
/**
 * Deletes a form from an Amplify app.
 */
export const deleteForm: API.OperationMethod<
  DeleteFormRequest,
  DeleteFormResponse,
  DeleteFormError,
  Credentials | HttpClient.HttpClient
> = /*@__PURE__*/ API.make(() => ({
  descriptor: {
    service: svc,
    http: "DELETE /app/{appId}/environment/{environmentName}/forms/{id}",
  },
  errors: [
    InternalServerException,
    InvalidParameterException,
    ResourceNotFoundException,
  ],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "DeleteForm",
})) as any;

export type DeleteThemeError =
  | InternalServerException
  | InvalidParameterException
  | ResourceNotFoundException
  | CommonErrors;
/**
 * Deletes a theme from an Amplify app.
 */
export const deleteTheme: API.OperationMethod<
  DeleteThemeRequest,
  DeleteThemeResponse,
  DeleteThemeError,
  Credentials | HttpClient.HttpClient
> = /*@__PURE__*/ API.make(() => ({
  descriptor: {
    service: svc,
    http: "DELETE /app/{appId}/environment/{environmentName}/themes/{id}",
  },
  errors: [
    InternalServerException,
    InvalidParameterException,
    ResourceNotFoundException,
  ],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "DeleteTheme",
})) as any;

export type ExchangeCodeForTokenError =
  | InvalidParameterException
  | CommonErrors;
/**
 * This is for internal use.
 *
 * Amplify uses this action to exchange an access code for a token.
 */
export const exchangeCodeForToken: API.OperationMethod<
  ExchangeCodeForTokenRequest,
  ExchangeCodeForTokenResponse,
  ExchangeCodeForTokenError,
  Credentials | HttpClient.HttpClient
> = /*@__PURE__*/ API.make(() => ({
  descriptor: {
    service: svc,
    http: "POST /tokens/{provider}",
    input: { request: D.m({ payload: true }) },
    output: { accessToken: D.secret, refreshToken: D.secret },
  },
  errors: [InvalidParameterException],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "ExchangeCodeForToken",
})) as any;

export type ExportComponentsError =
  | InternalServerException
  | InvalidParameterException
  | CommonErrors;
/**
 * Exports component configurations to code that is ready to integrate into an Amplify app.
 */
export const exportComponents: API.PaginatedOperationMethod<
  ExportComponentsRequest,
  ExportComponentsResponse,
  ExportComponentsError,
  Credentials | HttpClient.HttpClient,
  Component
> = /*@__PURE__*/ API.makePaginated(() => ({
  descriptor: {
    service: svc,
    http: "GET /export/app/{appId}/environment/{environmentName}/components",
    input: { nextToken: D.m({ query: "nextToken" }) },
    output: { entities: D.list(o_Component) },
  },
  errors: [InternalServerException, InvalidParameterException],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "ExportComponents",
  pagination: {
    inputToken: "nextToken",
    outputToken: "nextToken",
    items: "entities",
  } as const,
})) as any;

export type ExportFormsError =
  | InternalServerException
  | InvalidParameterException
  | CommonErrors;
/**
 * Exports form configurations to code that is ready to integrate into an Amplify app.
 */
export const exportForms: API.PaginatedOperationMethod<
  ExportFormsRequest,
  ExportFormsResponse,
  ExportFormsError,
  Credentials | HttpClient.HttpClient,
  Form
> = /*@__PURE__*/ API.makePaginated(() => ({
  descriptor: {
    service: svc,
    http: "GET /export/app/{appId}/environment/{environmentName}/forms",
    input: { nextToken: D.m({ query: "nextToken" }) },
  },
  errors: [InternalServerException, InvalidParameterException],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "ExportForms",
  pagination: {
    inputToken: "nextToken",
    outputToken: "nextToken",
    items: "entities",
  } as const,
})) as any;

export type ExportThemesError =
  | InternalServerException
  | InvalidParameterException
  | CommonErrors;
/**
 * Exports theme configurations to code that is ready to integrate into an Amplify app.
 */
export const exportThemes: API.PaginatedOperationMethod<
  ExportThemesRequest,
  ExportThemesResponse,
  ExportThemesError,
  Credentials | HttpClient.HttpClient,
  Theme
> = /*@__PURE__*/ API.makePaginated(() => ({
  descriptor: {
    service: svc,
    http: "GET /export/app/{appId}/environment/{environmentName}/themes",
    input: { nextToken: D.m({ query: "nextToken" }) },
    output: { entities: D.list(o_Theme) },
  },
  errors: [InternalServerException, InvalidParameterException],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "ExportThemes",
  pagination: {
    inputToken: "nextToken",
    outputToken: "nextToken",
    items: "entities",
  } as const,
})) as any;

export type GetCodegenJobError =
  | InternalServerException
  | InvalidParameterException
  | ResourceNotFoundException
  | ThrottlingException
  | CommonErrors;
/**
 * Returns an existing code generation job.
 */
export const getCodegenJob: API.OperationMethod<
  GetCodegenJobRequest,
  GetCodegenJobResponse,
  GetCodegenJobError,
  Credentials | HttpClient.HttpClient
> = /*@__PURE__*/ API.make(() => ({
  descriptor: {
    service: svc,
    http: "GET /app/{appId}/environment/{environmentName}/codegen-jobs/{id}",
    output: { job: D.m({ payload: true, shape: o_CodegenJob }) },
  },
  errors: [
    InternalServerException,
    InvalidParameterException,
    ResourceNotFoundException,
    ThrottlingException,
  ],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "GetCodegenJob",
})) as any;

export type GetComponentError =
  | InternalServerException
  | InvalidParameterException
  | ResourceNotFoundException
  | CommonErrors;
/**
 * Returns an existing component for an Amplify app.
 */
export const getComponent: API.OperationMethod<
  GetComponentRequest,
  GetComponentResponse,
  GetComponentError,
  Credentials | HttpClient.HttpClient
> = /*@__PURE__*/ API.make(() => ({
  descriptor: {
    service: svc,
    http: "GET /app/{appId}/environment/{environmentName}/components/{id}",
    output: { component: D.m({ payload: true, shape: o_Component }) },
  },
  errors: [
    InternalServerException,
    InvalidParameterException,
    ResourceNotFoundException,
  ],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "GetComponent",
})) as any;

export type GetFormError =
  | InternalServerException
  | InvalidParameterException
  | ResourceNotFoundException
  | CommonErrors;
/**
 * Returns an existing form for an Amplify app.
 */
export const getForm: API.OperationMethod<
  GetFormRequest,
  GetFormResponse,
  GetFormError,
  Credentials | HttpClient.HttpClient
> = /*@__PURE__*/ API.make(() => ({
  descriptor: {
    service: svc,
    http: "GET /app/{appId}/environment/{environmentName}/forms/{id}",
    output: { form: D.m({ payload: true }) },
  },
  errors: [
    InternalServerException,
    InvalidParameterException,
    ResourceNotFoundException,
  ],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "GetForm",
})) as any;

export type GetMetadataError =
  | InvalidParameterException
  | UnauthorizedException
  | CommonErrors;
/**
 * Returns existing metadata for an Amplify app.
 */
export const getMetadata: API.OperationMethod<
  GetMetadataRequest,
  GetMetadataResponse,
  GetMetadataError,
  Credentials | HttpClient.HttpClient
> = /*@__PURE__*/ API.make(() => ({
  descriptor: {
    service: svc,
    http: "GET /app/{appId}/environment/{environmentName}/metadata",
  },
  errors: [InvalidParameterException, UnauthorizedException],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "GetMetadata",
})) as any;

export type GetThemeError =
  | InternalServerException
  | InvalidParameterException
  | ResourceNotFoundException
  | CommonErrors;
/**
 * Returns an existing theme for an Amplify app.
 */
export const getTheme: API.OperationMethod<
  GetThemeRequest,
  GetThemeResponse,
  GetThemeError,
  Credentials | HttpClient.HttpClient
> = /*@__PURE__*/ API.make(() => ({
  descriptor: {
    service: svc,
    http: "GET /app/{appId}/environment/{environmentName}/themes/{id}",
    output: { theme: D.m({ payload: true, shape: o_Theme }) },
  },
  errors: [
    InternalServerException,
    InvalidParameterException,
    ResourceNotFoundException,
  ],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "GetTheme",
})) as any;

export type ListCodegenJobsError =
  | InternalServerException
  | InvalidParameterException
  | ThrottlingException
  | CommonErrors;
/**
 * Retrieves a list of code generation jobs for a specified Amplify app and backend environment.
 */
export const listCodegenJobs: API.PaginatedOperationMethod<
  ListCodegenJobsRequest,
  ListCodegenJobsResponse,
  ListCodegenJobsError,
  Credentials | HttpClient.HttpClient,
  CodegenJobSummary
> = /*@__PURE__*/ API.makePaginated(() => ({
  descriptor: {
    service: svc,
    http: "GET /app/{appId}/environment/{environmentName}/codegen-jobs",
    input: {
      nextToken: D.m({ query: "nextToken" }),
      maxResults: D.m({ query: "maxResults" }),
    },
    output: { entities: D.list({ createdAt: D.ts, modifiedAt: D.ts }) },
  },
  errors: [
    InternalServerException,
    InvalidParameterException,
    ThrottlingException,
  ],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "ListCodegenJobs",
  pagination: {
    inputToken: "nextToken",
    outputToken: "nextToken",
    items: "entities",
    pageSize: "maxResults",
  } as const,
})) as any;

export type ListComponentsError =
  | InternalServerException
  | InvalidParameterException
  | CommonErrors;
/**
 * Retrieves a list of components for a specified Amplify app and backend
 * environment.
 */
export const listComponents: API.PaginatedOperationMethod<
  ListComponentsRequest,
  ListComponentsResponse,
  ListComponentsError,
  Credentials | HttpClient.HttpClient,
  ComponentSummary
> = /*@__PURE__*/ API.makePaginated(() => ({
  descriptor: {
    service: svc,
    http: "GET /app/{appId}/environment/{environmentName}/components",
    input: {
      nextToken: D.m({ query: "nextToken" }),
      maxResults: D.m({ query: "maxResults" }),
    },
  },
  errors: [InternalServerException, InvalidParameterException],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "ListComponents",
  pagination: {
    inputToken: "nextToken",
    outputToken: "nextToken",
    items: "entities",
    pageSize: "maxResults",
  } as const,
})) as any;

export type ListFormsError =
  | InternalServerException
  | InvalidParameterException
  | CommonErrors;
/**
 * Retrieves a list of forms for a specified Amplify app and backend environment.
 */
export const listForms: API.PaginatedOperationMethod<
  ListFormsRequest,
  ListFormsResponse,
  ListFormsError,
  Credentials | HttpClient.HttpClient,
  FormSummary
> = /*@__PURE__*/ API.makePaginated(() => ({
  descriptor: {
    service: svc,
    http: "GET /app/{appId}/environment/{environmentName}/forms",
    input: {
      nextToken: D.m({ query: "nextToken" }),
      maxResults: D.m({ query: "maxResults" }),
    },
  },
  errors: [InternalServerException, InvalidParameterException],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "ListForms",
  pagination: {
    inputToken: "nextToken",
    outputToken: "nextToken",
    items: "entities",
    pageSize: "maxResults",
  } as const,
})) as any;

export type ListTagsForResourceError =
  | InternalServerException
  | InvalidParameterException
  | ResourceNotFoundException
  | ThrottlingException
  | UnauthorizedException
  | CommonErrors;
/**
 * Returns a list of tags for a specified Amazon Resource Name (ARN).
 */
export const listTagsForResource: API.OperationMethod<
  ListTagsForResourceRequest,
  ListTagsForResourceResponse,
  ListTagsForResourceError,
  Credentials | HttpClient.HttpClient
> = /*@__PURE__*/ API.make(() => ({
  descriptor: { service: svc, http: "GET /tags/{resourceArn}" },
  errors: [
    InternalServerException,
    InvalidParameterException,
    ResourceNotFoundException,
    ThrottlingException,
    UnauthorizedException,
  ],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "ListTagsForResource",
})) as any;

export type ListThemesError =
  | InternalServerException
  | InvalidParameterException
  | CommonErrors;
/**
 * Retrieves a list of themes for a specified Amplify app and backend
 * environment.
 */
export const listThemes: API.PaginatedOperationMethod<
  ListThemesRequest,
  ListThemesResponse,
  ListThemesError,
  Credentials | HttpClient.HttpClient,
  ThemeSummary
> = /*@__PURE__*/ API.makePaginated(() => ({
  descriptor: {
    service: svc,
    http: "GET /app/{appId}/environment/{environmentName}/themes",
    input: {
      nextToken: D.m({ query: "nextToken" }),
      maxResults: D.m({ query: "maxResults" }),
    },
  },
  errors: [InternalServerException, InvalidParameterException],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "ListThemes",
  pagination: {
    inputToken: "nextToken",
    outputToken: "nextToken",
    items: "entities",
    pageSize: "maxResults",
  } as const,
})) as any;

export type PutMetadataFlagError =
  | InvalidParameterException
  | UnauthorizedException
  | CommonErrors;
/**
 * Stores the metadata information about a feature on a form.
 */
export const putMetadataFlag: API.OperationMethod<
  PutMetadataFlagRequest,
  PutMetadataFlagResponse,
  PutMetadataFlagError,
  Credentials | HttpClient.HttpClient
> = /*@__PURE__*/ API.make(() => ({
  descriptor: {
    service: svc,
    http: "PUT /app/{appId}/environment/{environmentName}/metadata/features/{featureName}",
    input: { body: D.m({ payload: true }) },
  },
  errors: [InvalidParameterException, UnauthorizedException],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "PutMetadataFlag",
})) as any;

export type RefreshTokenError = InvalidParameterException | CommonErrors;
/**
 * This is for internal use.
 *
 * Amplify uses this action to refresh a previously issued access token that might have expired.
 */
export const refreshToken: API.OperationMethod<
  RefreshTokenRequest,
  RefreshTokenResponse,
  RefreshTokenError,
  Credentials | HttpClient.HttpClient
> = /*@__PURE__*/ API.make(() => ({
  descriptor: {
    service: svc,
    http: "POST /tokens/{provider}/refresh",
    input: { refreshTokenBody: D.m({ payload: true }) },
    output: { accessToken: D.secret },
  },
  errors: [InvalidParameterException],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "RefreshToken",
})) as any;

export type StartCodegenJobError =
  | InternalServerException
  | InvalidParameterException
  | ThrottlingException
  | CommonErrors;
/**
 * Starts a code generation job for a specified Amplify app and backend environment.
 */
export const startCodegenJob: API.OperationMethod<
  StartCodegenJobRequest,
  StartCodegenJobResponse,
  StartCodegenJobError,
  Credentials | HttpClient.HttpClient
> = /*@__PURE__*/ API.make(() => ({
  descriptor: {
    service: svc,
    http: "POST /app/{appId}/environment/{environmentName}/codegen-jobs",
    input: {
      clientToken: D.m({ query: "clientToken", idempotency: true }),
      codegenJobToCreate: D.m({ payload: true }),
    },
    output: { entity: D.m({ payload: true, shape: o_CodegenJob }) },
  },
  errors: [
    InternalServerException,
    InvalidParameterException,
    ThrottlingException,
  ],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "StartCodegenJob",
})) as any;

export type TagResourceError =
  | InternalServerException
  | InvalidParameterException
  | ResourceNotFoundException
  | ThrottlingException
  | UnauthorizedException
  | CommonErrors;
/**
 * Tags the resource with a tag key and value.
 */
export const tagResource: API.OperationMethod<
  TagResourceRequest,
  TagResourceResponse,
  TagResourceError,
  Credentials | HttpClient.HttpClient
> = /*@__PURE__*/ API.make(() => ({
  descriptor: { service: svc, http: "POST /tags/{resourceArn}", body: true },
  errors: [
    InternalServerException,
    InvalidParameterException,
    ResourceNotFoundException,
    ThrottlingException,
    UnauthorizedException,
  ],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "TagResource",
})) as any;

export type UntagResourceError =
  | InternalServerException
  | InvalidParameterException
  | ResourceNotFoundException
  | ThrottlingException
  | UnauthorizedException
  | CommonErrors;
/**
 * Untags a resource with a specified Amazon Resource Name (ARN).
 */
export const untagResource: API.OperationMethod<
  UntagResourceRequest,
  UntagResourceResponse,
  UntagResourceError,
  Credentials | HttpClient.HttpClient
> = /*@__PURE__*/ API.make(() => ({
  descriptor: {
    service: svc,
    http: "DELETE /tags/{resourceArn}",
    input: { tagKeys: D.m({ query: "tagKeys" }) },
  },
  errors: [
    InternalServerException,
    InvalidParameterException,
    ResourceNotFoundException,
    ThrottlingException,
    UnauthorizedException,
  ],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "UntagResource",
})) as any;

export type UpdateComponentError =
  | InternalServerException
  | InvalidParameterException
  | ResourceConflictException
  | CommonErrors;
/**
 * Updates an existing component.
 */
export const updateComponent: API.OperationMethod<
  UpdateComponentRequest,
  UpdateComponentResponse,
  UpdateComponentError,
  Credentials | HttpClient.HttpClient
> = /*@__PURE__*/ API.make(() => ({
  descriptor: {
    service: svc,
    http: "PATCH /app/{appId}/environment/{environmentName}/components/{id}",
    input: {
      clientToken: D.m({ query: "clientToken", idempotency: true }),
      updatedComponent: D.m({ payload: true }),
    },
    output: { entity: D.m({ payload: true, shape: o_Component }) },
  },
  errors: [
    InternalServerException,
    InvalidParameterException,
    ResourceConflictException,
  ],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "UpdateComponent",
})) as any;

export type UpdateFormError =
  | InternalServerException
  | InvalidParameterException
  | ResourceConflictException
  | CommonErrors;
/**
 * Updates an existing form.
 */
export const updateForm: API.OperationMethod<
  UpdateFormRequest,
  UpdateFormResponse,
  UpdateFormError,
  Credentials | HttpClient.HttpClient
> = /*@__PURE__*/ API.make(() => ({
  descriptor: {
    service: svc,
    http: "PATCH /app/{appId}/environment/{environmentName}/forms/{id}",
    input: {
      clientToken: D.m({ query: "clientToken", idempotency: true }),
      updatedForm: D.m({ payload: true }),
    },
    output: { entity: D.m({ payload: true }) },
  },
  errors: [
    InternalServerException,
    InvalidParameterException,
    ResourceConflictException,
  ],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "UpdateForm",
})) as any;

export type UpdateThemeError =
  | InternalServerException
  | InvalidParameterException
  | ResourceConflictException
  | CommonErrors;
/**
 * Updates an existing theme.
 */
export const updateTheme: API.OperationMethod<
  UpdateThemeRequest,
  UpdateThemeResponse,
  UpdateThemeError,
  Credentials | HttpClient.HttpClient
> = /*@__PURE__*/ API.make(() => ({
  descriptor: {
    service: svc,
    http: "PATCH /app/{appId}/environment/{environmentName}/themes/{id}",
    input: {
      clientToken: D.m({ query: "clientToken", idempotency: true }),
      updatedTheme: D.m({ payload: true }),
    },
    output: { entity: D.m({ payload: true, shape: o_Theme }) },
  },
  errors: [
    InternalServerException,
    InvalidParameterException,
    ResourceConflictException,
  ],
  protocol: AwsProtocol,
  retry: Retry,
  operationName: "UpdateTheme",
})) as any;

const o_CodegenJob: D.LazyStruct = () => ({
  createdAt: D.ts,
  modifiedAt: D.ts,
});
const o_Component: D.LazyStruct = () => ({ createdAt: D.ts, modifiedAt: D.ts });
const o_Theme: D.LazyStruct = () => ({ createdAt: D.ts, modifiedAt: D.ts });
