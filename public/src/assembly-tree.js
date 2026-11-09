// Hierarchical Assembly Tree for LEGO WeDo 2.0 - Lesson 06: Little Frog
// Coordinate convention (LDraw LDU: 1 stud = 20 LDU, 1 plate height = 8 LDU, 1 brick = 24 LDU, -Y is UP):
//   -Z = Front (head/mouth), +Z = Rear (tail/motor), -X = Right side (gears/motor), +X = Left side

export const LDRAW_COLORS = {
  0:   { hex: 0x1B2A34, edge: 0x808080, alpha: 1.0,  name: "Black" },
  2:   { hex: 0x00852B, edge: 0x333333, alpha: 1.0,  name: "Green" },
  4:   { hex: 0xB40000, edge: 0x333333, alpha: 1.0,  name: "Red" },
  15:  { hex: 0xF4F4F4, edge: 0x333333, alpha: 1.0,  name: "White" },
  27:  { hex: 0xA5CA18, edge: 0x333333, alpha: 1.0,  name: "Lime" },
  43:  { hex: 0xAEE9EF, edge: 0x59D1DE, alpha: 0.55, name: "Trans_Light_Blue" },
  71:  { hex: 0x969696, edge: 0x333333, alpha: 1.0,  name: "Light_Bluish_Grey" },
  72:  { hex: 0x646464, edge: 0x333333, alpha: 1.0,  name: "Dark_Bluish_Grey" },
  191: { hex: 0xFCAC00, edge: 0x333333, alpha: 1.0,  name: "Bright_Light_Orange" },
  256: { hex: 0x1B2A34, edge: 0x808080, alpha: 1.0,  rubber: true, name: "Rubber_Black" },
  322: { hex: 0x68C3E2, edge: 0x333333, alpha: 1.0,  name: "Medium_Azure" }
};

// Standard 3x3 rotation matrices in LDraw row-major order [a,b,c, d,e,f, g,h,i]
const R_ID         = [ 1, 0, 0,  0, 1, 0,  0, 0, 1];
const R_Y90        = [ 0, 0, 1,  0, 1, 0, -1, 0, 0];
const R_Y180       = [-1, 0, 0,  0, 1, 0,  0, 0,-1];
const R_Y270       = [ 0, 0,-1,  0, 1, 0,  1, 0, 0];
// Rotate Z-axis part (gears, pinholes) to align along X-axis
const R_Z2X        = [ 0, 0, 1,  0, 1, 0, -1, 0, 0];
// Rotate vertical tile to face -X (right outward eyes)
const R_FACE_RIGHT = [ 0, 1, 0,  0, 0, 1,  1, 0, 0];
// Rotate vertical tile to face +X (left outward eyes)
const R_FACE_LEFT  = [ 0,-1, 0,  0, 0, 1, -1, 0, 0];
// Vertical Technic beam (X-axis along +Y down, hole axis along X)
const R_VERT_DOWN  = [ 0, 0, 1,  1, 0, 0,  0, 1, 0];

export const ASSEMBLY_TREE = {
  "id": "little_frog_root",
  "type": "root",
  "children": [
    // =========================================================================
    // STEP 1: Chassis Base, Skids, Side Rails, and Rear Riser
    // =========================================================================
    {
      "id": "step_1",
      "stepNumber": 1,
      "type": "step",
      "stepInventory": [
        { "order": 1, "part": "2654a.dat", "color": 0,   "qty": 5 },
        { "order": 2, "part": "3665a.dat", "color": 191, "qty": 2 },
        { "order": 3, "part": "3709b.dat", "color": 191, "qty": 1 },
        { "order": 4, "part": "3701.dat",  "color": 27,  "qty": 2 },
        { "order": 5, "part": "32001.dat", "color": 191, "qty": 2 },
        { "order": 6, "part": "3702.dat",  "color": 27,  "qty": 2 }
      ],
      "children": [
        {
          "id": "sub_1_skids",
          "type": "subassembly",
          "parts": [
            { "id": "s1_skid_fr",   "part": "2654a.dat", "color": 0, "pos": [-40, 8, -60], "rot": R_ID },
            { "id": "s1_skid_fl",   "part": "2654a.dat", "color": 0, "pos": [ 40, 8, -60], "rot": R_ID },
            { "id": "s1_skid_rr",   "part": "2654a.dat", "color": 0, "pos": [-40, 8,  80], "rot": R_ID },
            { "id": "s1_skid_rl",   "part": "2654a.dat", "color": 0, "pos": [ 40, 8,  80], "rot": R_ID },
            { "id": "s1_skid_tail", "part": "2654a.dat", "color": 0, "pos": [  0, 8, 160], "rot": R_ID }
          ]
        },
        {
          "id": "sub_1_base_plates",
          "type": "subassembly",
          "parts": [
            { "id": "s1_plate_front", "part": "32001.dat", "color": 191, "pos": [  0,   0, -60], "rot": R_ID },
            { "id": "s1_plate_rear",  "part": "32001.dat", "color": 191, "pos": [  0,   0,  80], "rot": R_ID },
            { "id": "s1_plate_tail",  "part": "3709b.dat", "color": 191, "pos": [  0,   0, 140], "rot": R_Y90 },
            { "id": "s1_inv_slope_r", "part": "3665a.dat", "color": 191, "pos": [-50, -24, -70], "rot": R_ID },
            { "id": "s1_inv_slope_l", "part": "3665a.dat", "color": 191, "pos": [ 50, -24, -70], "rot": R_ID }
          ]
        },
        {
          "id": "sub_1_rails_and_riser",
          "type": "subassembly",
          "parts": [
            { "id": "s1_rail_r",   "part": "3702.dat", "color": 27, "pos": [-50, -24,  20], "rot": R_Y90 },
            { "id": "s1_rail_l",   "part": "3702.dat", "color": 27, "pos": [ 50, -24,  20], "rot": R_Y90 },
            { "id": "s1_riser_b1", "part": "3701.dat", "color": 27, "pos": [-10, -24, 100], "rot": R_Y90 },
            { "id": "s1_riser_b2", "part": "3701.dat", "color": 27, "pos": [ 10, -24, 100], "rot": R_Y90 }
          ]
        }
      ]
    },

    // =========================================================================
    // STEP 2: Smart Hub, Side Arches, Medium Motor, and Drive Axle 3L
    // =========================================================================
    {
      "id": "step_2",
      "stepNumber": 2,
      "type": "step",
      "stepInventory": [
        { "order": 1, "part": "2780.dat",  "color": 0,   "qty": 1 },
        { "order": 2, "part": "4519.dat",  "color": 71,  "qty": 1 },
        { "order": 3, "part": "3004.dat",  "color": 322, "qty": 2 },
        { "order": 4, "part": "93273.dat", "color": 322, "qty": 2 },
        { "order": 5, "part": "42022.dat", "color": 27,  "qty": 2 },
        { "order": 6, "part": "21980.dat", "color": 71,  "qty": 1 },
        { "order": 7, "part": "19071.dat", "color": 15,  "qty": 1 }
      ],
      "children": [
        {
          "id": "sub_2_smarthub",
          "type": "subassembly",
          "parts": [
            { "id": "s2_smarthub",   "part": "19071.dat", "color": 15,  "pos": [  0, -72, -60], "rot": R_ID },
            { "id": "s2_hub_arch_f", "part": "93273.dat", "color": 322, "pos": [-10, -72, -40], "rot": R_ID },
            { "id": "s2_hub_arch_r", "part": "93273.dat", "color": 322, "pos": [ 10, -72, -40], "rot": R_ID }
          ]
        },
        {
          "id": "sub_2_side_arches",
          "type": "subassembly",
          "parts": [
            { "id": "s2_azure_r", "part": "3004.dat",  "color": 322, "pos": [-50, -48,   0], "rot": R_Y90 },
            { "id": "s2_azure_l", "part": "3004.dat",  "color": 322, "pos": [ 50, -48,   0], "rot": R_Y90 },
            { "id": "s2_slope_r", "part": "42022.dat", "color": 27,  "pos": [-50, -72, -80], "rot": R_Y180 },
            { "id": "s2_slope_l", "part": "42022.dat", "color": 27,  "pos": [ 50, -72, -80], "rot": R_Y180 }
          ]
        },
        {
          "id": "sub_2_motor",
          "type": "subassembly",
          "parts": [
            { "id": "s2_motor",    "part": "21980.dat", "color": 71, "pos": [-40, -80, 80], "rot": R_Y90 },
            { "id": "s2_axle_3l",  "part": "4519.dat",  "color": 71, "pos": [-60, -54, 80], "rot": R_ID },
            { "id": "s2_pin_fric", "part": "2780.dat",  "color": 0,  "pos": [-50, -34, 80], "rot": R_ID }
          ]
        }
      ]
    },

    // =========================================================================
    // STEP 3: Bevel Gear Train, Vertical Support Beam, Cross Axle, and Coupler
    // =========================================================================
    {
      "id": "step_3",
      "stepNumber": 3,
      "type": "step",
      "stepInventory": [
        { "order": 1, "part": "32062.dat", "color": 4,  "qty": 1 },
        { "order": 2, "part": "59443.dat", "color": 71, "qty": 1 },
        { "order": 3, "part": "32270.dat", "color": 0,  "qty": 1 },
        { "order": 4, "part": "18575.dat", "color": 0,  "qty": 1 },
        { "order": 5, "part": "3701.dat",  "color": 27, "qty": 1 },
        { "order": 6, "part": "3737.dat",  "color": 0,  "qty": 1 }
      ],
      "children": [
        {
          "id": "sub_3_coupler",
          "type": "subassembly",
          "parts": [
            { "id": "s3_joiner",  "part": "59443.dat", "color": 71, "pos": [ 80, -14, 80], "rot": R_Z2X },
            { "id": "s3_red_ax2", "part": "32062.dat", "color": 4,  "pos": [100, -14, 80], "rot": R_Y180 }
          ]
        },
        {
          "id": "sub_3_gear_support",
          "type": "subassembly",
          "parts": [
            { "id": "s3_support_1x4", "part": "3701.dat", "color": 27, "pos": [-70, -34, 70], "rot": R_VERT_DOWN }
          ]
        },
        {
          "id": "sub_3_gears_and_axle",
          "type": "subassembly",
          "parts": [
            { "id": "s3_gear_12t", "part": "32270.dat", "color": 0, "pos": [-90, -54, 80], "rot": R_Z2X },
            { "id": "s3_gear_20t", "part": "18575.dat", "color": 0, "pos": [-90, -14, 80], "rot": R_Z2X },
            { "id": "s3_axle_10l", "part": "3737.dat",  "color": 0, "pos": [-20, -14, 80], "rot": R_ID }
          ]
        }
      ]
    },

    // =========================================================================
    // STEP 4: Lower Jaw, Chin Skid, and Frog Snout
    // =========================================================================
    {
      "id": "step_4",
      "stepNumber": 4,
      "type": "step",
      "stepInventory": [
        { "order": 1, "part": "2654a.dat", "color": 0,   "qty": 1 },
        { "order": 2, "part": "4032a.dat", "color": 2,   "qty": 1 },
        { "order": 3, "part": "3040b.dat", "color": 27,  "qty": 2 },
        { "order": 4, "part": "3665a.dat", "color": 191, "qty": 2 },
        { "order": 5, "part": "3709b.dat", "color": 191, "qty": 1 }
      ],
      "children": [
        {
          "id": "sub_4_jaw_base",
          "type": "subassembly",
          "parts": [
            { "id": "s4_jaw_plate", "part": "3709b.dat", "color": 191, "pos": [  0,   0, -120], "rot": R_Y90 },
            { "id": "s4_jaw_skid",  "part": "2654a.dat", "color": 0,   "pos": [  0,   8, -140], "rot": R_ID },
            { "id": "s4_jaw_inv_r", "part": "3665a.dat", "color": 191, "pos": [-10, -24, -150], "rot": R_ID },
            { "id": "s4_jaw_inv_l", "part": "3665a.dat", "color": 191, "pos": [ 10, -24, -150], "rot": R_ID }
          ]
        },
        {
          "id": "sub_4_snout",
          "type": "subassembly",
          "parts": [
            { "id": "s4_green_rnd", "part": "4032a.dat", "color": 2,  "pos": [  0, -32, -160], "rot": R_ID },
            { "id": "s4_snout_r",   "part": "3040b.dat", "color": 27, "pos": [-10, -56, -150], "rot": R_ID },
            { "id": "s4_snout_l",   "part": "3040b.dat", "color": 27, "pos": [ 10, -56, -150], "rot": R_ID }
          ]
        }
      ]
    },

    // =========================================================================
    // STEP 5: Side-Facing Eyes, Eyebrows, and Rear Tail Slopes
    // =========================================================================
    {
      "id": "step_5",
      "stepNumber": 5,
      "type": "step",
      "stepInventory": [
        { "order": 1, "part": "98138pb007.dat", "color": 15,  "qty": 2 },
        { "order": 2, "part": "50950.dat",      "color": 27,  "qty": 2 },
        { "order": 3, "part": "18674.dat",      "color": 15,  "qty": 2 },
        { "order": 4, "part": "4286.dat",       "color": 191, "qty": 2 },
        { "order": 5, "part": "44728.dat",      "color": 15,  "qty": 2 },
        { "order": 6, "part": "42022.dat",      "color": 43,  "qty": 2 }
      ],
      "children": [
        {
          "id": "sub_5_eyes",
          "type": "subassembly",
          "parts": [
            { "id": "s5_bracket_r", "part": "44728.dat",      "color": 15, "pos": [-30, -80, -160], "rot": R_Y90 },
            { "id": "s5_bracket_l", "part": "44728.dat",      "color": 15, "pos": [ 30, -80, -160], "rot": R_Y270 },
            { "id": "s5_eyebase_r", "part": "18674.dat",      "color": 15, "pos": [-54, -66, -160], "rot": R_FACE_RIGHT },
            { "id": "s5_eyebase_l", "part": "18674.dat",      "color": 15, "pos": [ 54, -66, -160], "rot": R_FACE_LEFT },
            { "id": "s5_eyeball_r", "part": "98138pb007.dat", "color": 15, "pos": [-62, -66, -160], "rot": R_FACE_RIGHT },
            { "id": "s5_eyeball_l", "part": "98138pb007.dat", "color": 15, "pos": [ 62, -66, -160], "rot": R_FACE_LEFT },
            { "id": "s5_brow_r",    "part": "50950.dat",      "color": 27, "pos": [-30, -96, -130], "rot": R_Y180 },
            { "id": "s5_brow_l",    "part": "50950.dat",      "color": 27, "pos": [ 30, -96, -130], "rot": R_Y180 }
          ]
        },
        {
          "id": "sub_5_tail",
          "type": "subassembly",
          "parts": [
            { "id": "s5_tail_orange_r", "part": "4286.dat",  "color": 191, "pos": [-10, -48, 130], "rot": R_Y180 },
            { "id": "s5_tail_orange_l", "part": "4286.dat",  "color": 191, "pos": [ 10, -48, 130], "rot": R_Y180 },
            { "id": "s5_tail_trans_r",  "part": "42022.dat", "color": 43,  "pos": [-10, -24, 160], "rot": R_Y180 },
            { "id": "s5_tail_trans_l",  "part": "42022.dat", "color": 43,  "pos": [ 10, -24, 160], "rot": R_Y180 }
          ]
        }
      ]
    },

    // =========================================================================
    // STEP 6: Left & Right Hind Legs and Rubber Feet
    // =========================================================================
    {
      "id": "step_6",
      "stepNumber": 6,
      "type": "step",
      "stepInventory": [
        { "order": 1, "part": "32062.dat",  "color": 4,   "qty": 2 },
        { "order": 2, "part": "45590.dat",  "color": 256, "qty": 2 },
        { "order": 3, "part": "32064a.dat", "color": 72,  "qty": 4 },
        { "order": 4, "part": "3710.dat",   "color": 15,  "qty": 4 }
      ],
      "children": [
        {
          "id": "sub_6_leg_right",
          "type": "subassembly",
          "parts": [
            { "id": "s6_r_brick_1", "part": "32064a.dat", "color": 72,  "pos": [-110, -24,  80], "rot": R_Y90 },
            { "id": "s6_r_brick_2", "part": "32064a.dat", "color": 72,  "pos": [-110, -24, 120], "rot": R_Y90 },
            { "id": "s6_r_plate_t", "part": "3710.dat",   "color": 15,  "pos": [-110, -32, 100], "rot": R_Y90 },
            { "id": "s6_r_plate_b", "part": "3710.dat",   "color": 15,  "pos": [-110,   0, 100], "rot": R_Y90 },
            { "id": "s6_r_axle2",   "part": "32062.dat",  "color": 4,   "pos": [-120, -14, 120], "rot": R_ID },
            { "id": "s6_r_rubber",  "part": "45590.dat",  "color": 256, "pos": [-130, -14, 120], "rot": R_Y270 }
          ]
        },
        {
          "id": "sub_6_leg_left",
          "type": "subassembly",
          "parts": [
            { "id": "s6_l_brick_1", "part": "32064a.dat", "color": 72,  "pos": [ 110, -24,  80], "rot": R_Y90 },
            { "id": "s6_l_brick_2", "part": "32064a.dat", "color": 72,  "pos": [ 110, -24, 120], "rot": R_Y90 },
            { "id": "s6_l_plate_t", "part": "3710.dat",   "color": 15,  "pos": [ 110, -32, 100], "rot": R_Y90 },
            { "id": "s6_l_plate_b", "part": "3710.dat",   "color": 15,  "pos": [ 110,   0, 100], "rot": R_Y90 },
            { "id": "s6_l_axle2",   "part": "32062.dat",  "color": 4,   "pos": [ 120, -14, 120], "rot": R_ID },
            { "id": "s6_l_rubber",  "part": "45590.dat",  "color": 256, "pos": [ 130, -14, 120], "rot": R_Y270 }
          ]
        }
      ]
    }
  ]
};

export function getVisibleStepNumbers(stateIndex) {
  if (stateIndex === 0 || stateIndex === 7) {
    return [1, 2, 3, 4, 5, 6];
  }
  const nums = [];
  for (let i = 1; i <= stateIndex; i++) nums.push(i);
  return nums;
}

export const getVisibleStepIds = getVisibleStepNumbers;

export function getActiveStepNode(stateIndex) {
  if (stateIndex < 1 || stateIndex > 6) return null;
  return ASSEMBLY_TREE.children.find((s) => s.stepNumber === stateIndex) || null;
}

export function getActiveStepInventory(stateIndex) {
  const node = getActiveStepNode(stateIndex);
  return node ? node.stepInventory : [];
}

export function flattenStepParts(stepNode) {
  if (!stepNode || !Array.isArray(stepNode.children)) return [];
  const result = [];
  for (const sub of stepNode.children) {
    if (!sub || !Array.isArray(sub.parts)) continue;
    for (const part of sub.parts) {
      result.push({ ...part, subassemblyId: sub.id, stepId: stepNode.id, stepNumber: stepNode.stepNumber });
    }
  }
  return result;
}
