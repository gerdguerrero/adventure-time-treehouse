"""Original NEPTR miniature; Blender Z-up, front -Y. No downloaded model assets."""
import bpy, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(n,c):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*c,1);m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.78;return m
metal=mat('NEPTR sage enamel',(.38,.46,.43));rim=mat('NEPTR tin blue grey',(.30,.36,.43));dark=mat('NEPTR ink and rubber',(.025,.045,.055));glass=mat('NEPTR warm microwave glass',(.64,.64,.27));cream=mat('NEPTR ivory keys',(.76,.77,.61));wire=mat('NEPTR muted red wire',(.43,.16,.10));green=mat('NEPTR circuit board',(.16,.37,.22))
head=bpy.data.objects.new('NEPTR_head',None);bpy.context.collection.objects.link(head);head.location=(0,0,.81)
def finish(o,n,m,parent=None):
 o.name=n;o.data.materials.append(m)
 if parent:
  loc=o.location.copy();o.parent=parent;o.location=loc-parent.location
 return o
def box(n,p,s,m,bevel=.02,parent=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.scale=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Soft manufactured edges','BEVEL');mod.width=bevel;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return finish(o,n,m,parent)
def cyl(n,p,r,d,m,rot=(0,0,0),parent=None):
 bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r,depth=d,location=p,rotation=rot);return finish(bpy.context.object,n,m,parent)
def line(n,points,r,m,parent=None):
 curve=bpy.data.curves.new(n,'CURVE');curve.dimensions='3D';curve.bevel_depth=r;curve.bevel_resolution=2;s=curve.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for b,p in zip(s.bezier_points,points):
  b.co=p;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
  if 'arm' in n.lower() or 'Gripper' in n:b.handle_left_type='VECTOR';b.handle_right_type='VECTOR'
 o=bpy.data.objects.new(n,curve);bpy.context.collection.objects.link(o);o.data.materials.append(m)
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
 if parent:o.parent=parent;o.location=-parent.location
 return o
door=bpy.data.objects.new('NEPTR_door',None);bpy.context.collection.objects.link(door);door.location=(-.48,-.265,.53)
# Wide squat microwave on two tracked bogies.
box('NEPTR microwave', (0,0,.52),(1.02,.46,.56),metal)
box('Oven dark cavity',(-.23,-.241,.53),(.48,.025,.44),dark)
box('Door dark gasket',(-.23,-.265,.53),(.48,.025,.44),dark,parent=door)
box('Door yellow glass',(-.23,-.285,.53),(.42,.018,.38),glass,parent=door)
# Diagonal reflected light across the yellow glass.
for points in [[(-.41,-.296,.40),(-.39,-.296,.37),(-.045,-.296,.655),(-.065,-.296,.685)],[(-.36,-.296,.37),(-.352,-.296,.363),(-.025,-.296,.635),(-.033,-.296,.642)]]:
 mesh=bpy.data.meshes.new('Glass sheen');mesh.from_pydata(points,[],[(0,1,2,3)]);mesh.update();o=bpy.data.objects.new('Flat glass reflection',mesh);bpy.context.collection.objects.link(o);finish(o,'Flat glass reflection',cream,door)
box('Control panel',( .075,-.247,.52),(.16,.025,.44),rim,.006)
box('Display',(.075,-.267,.685),(.11,.012,.065),green,.004)
for i in range(3):
 for j in range(4):box('Key',(.027+i*.047,-.272,.42+j*.047),(.033,.014,.031),cream,.002)
box('Release',(.075,-.272,.34),(.10,.013,.04),cream,.003)
# Round inset eyes and open mouth on the RIGHT SIDE of the microwave, as in the reference.
for y in [-.12,.12]:
 cyl('Side eye socket',(.515,y,.64),.048,.012,dark,(0,math.pi/2,0))
 cyl('Side eye rim',(.524,y,.64),.034,.014,rim,(0,math.pi/2,0))
 cyl('Side eye pupil',(.535,y,.64),.019,.015,dark,(0,math.pi/2,0))
# Flattened oval mouth, raised rim and small tongue.
for name,x,sy,sz,m in [('Mouth outline',.516,.18,.074,dark),('Mouth rim',.524,.158,.056,rim),('Mouth inside',.534,.14,.043,dark)]:
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=(x,0,.49));o=bpy.context.object;o.scale=(.012,sy,sz);finish(o,name,m)
for y in [-.07,0,.07]:box('Mouth tooth',(.548,y,.513),(.012,.016,.012),cream,.002)
box('Tongue',(.548,.025,.465),(.014,.085,.016),wire,.006)
# A seam defines the narrow keypad strip on the front.
line('Panel divider',[(.18,-.237,.25),(.18,-.237,.79)],.006,dark)
cyl('Red release button',(.105,-.284,.34),.015,.008,wire,(math.pi/2,0,0))
# Continuous capsule-shaped track belts, with wheels inside the flat side walls.
for x in [-.37,.37]:
 contour=[]
 for cy,start in [(.27,-math.pi/2),(-.27,math.pi/2)]:
  for i in range(17):
   a=start+i*math.pi/16;contour.append((cy+.125*math.cos(a),.14+.125*math.sin(a)))
 # Capsule lies along Y: use semicircles on its ends.
 contour=[]
 for cy,start in [(.27,0),(-.27,math.pi)]:
  for i in range(17):
   a=start+i*math.pi/16;contour.append((cy+.125*math.sin(a),.14+.125*math.cos(a)))
 verts=[(xx,y,z) for xx in [x-.145,x+.145] for y,z in contour];n=len(contour)
 faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 mesh=bpy.data.meshes.new('Continuous belt');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Continuous rubber track',mesh);bpy.context.collection.objects.link(o);finish(o,'Continuous rubber track',dark)
 for y in [-.27,0,.27]:
  side=x+(-.146 if x<0 else .146)
  cyl('Recessed wheel',(side,y,.14),.079,.004,metal,(0,math.pi/2,0))
  cyl('Wheel axle',(side+(-.004 if x<0 else .004),y,.14),.013,.005,dark,(0,math.pi/2,0))
 for y in [-.23,-.08,.08,.23]:
  box('Belt top joint',(x,y,.266),(.286,.008,.004),rim,.001)
# Chassis fascia carries a small inset circuit board, not a hanging green plate.
box('Circuit chassis fascia',(0,-.27,.145),(.40,.09,.235),rim,.008)
box('Circuit dark recess',(0,-.319,.145),(.285,.008,.163),dark,.003)
box('Exposed underside circuit board',(0,-.326,.145),(.245,.008,.126),green,.002)
box('Circuit chip',(0,-.334,.145),(.064,.01,.050),dark,.002)
for x in [-.075,.075]:
 for z in [.11,.14,.17]:box('Circuit component',(x,-.335,z),(.019,.008,.012),cream,.001)
for x in [-.047,.047]:line('Board trace',[(x,-.335,.095),(x,-.335,.18),(x*.5,-.335,.19)],.002,cream)
for x in [-.118,.118]:
 o=box('Circuit securing tape',(x,-.34,.145),(.025,.005,.15),cream,.001);o.rotation_euler.y=-.18
# Hollow, slightly crumpled tin can. Top rim is open, not a capped cylinder.
verts=[];faces=[];rings=[(.815,.148,0),(.91,.162,-.015),(1.015,.15,-.025),(1.145,.163,-.05),(1.21,.163,-.062),(1.21,.145,-.062),(1.175,.144,-.055)]
N=48
for z,r,dx in rings:
 for i in range(N):
  a=2*math.pi*i/N;rr=r*(1+.025*math.sin(a*3+z*12));verts.append((dx+rr*math.cos(a),.02+rr*math.sin(a),z))
for j in range(len(rings)-1):
 for i in range(N):faces.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
mesh=bpy.data.meshes.new('Crumpled can shell');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Tin can shell',mesh);bpy.context.collection.objects.link(o);finish(o,'Tin can shell',rim,head)
cyl('Deep can interior',(-.04,.02,1.17),.141,.008,dark,parent=head)
for z,r,dx in [(.825,.148,0),(.925,.16,-.017),(1.065,.156,-.035),(1.205,.163,-.062)]:
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=.007,major_segments=48,minor_segments=6,location=(dx,.02,z));finish(bpy.context.object,'Rolled tin rib',dark if z>1.2 else rim,head)
# Serrated peeled-back lid with concentric pressed rings.
center=Vector((-.06,.20,1.385));rotation=math.radians(78)
verts=[tuple(center)];
for i in range(64):
 a=2*math.pi*i/64;r=.17 if i%2==0 else .158
 verts.append(tuple(center+Vector((r*math.cos(a),r*math.sin(a)*math.cos(rotation),r*math.sin(a)*math.sin(rotation)))))
mesh=bpy.data.meshes.new('Peeled lid');mesh.from_pydata(verts,[],[(0,i+1,(i+1)%64+1) for i in range(64)]);mesh.update();o=bpy.data.objects.new('Scalloped lid',mesh);bpy.context.collection.objects.link(o);finish(o,'Scalloped lid',rim,head)
for r in [.11,.145]:
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=.004,major_segments=40,minor_segments=6,location=center,rotation=(rotation,0,0));finish(bpy.context.object,'Pressed lid rings',metal,head)
line('Bent lid hinge',[(-.06,.165,1.205),(-.06,.17,1.23),(-.06,.166,1.25)],.014,rim,head)
for i in range(2):line('Loose wire',[(-.09+i*.07,.015,1.176),(-.10+i*.09,.0,1.28),(-.16+i*.12,-.01,1.37)],.011,[wire,glass][i],head)
for i in range(2):line('Coiled wire',[( -.14+i*.10,-.02,1.18),(-.10+i*.10,-.055,1.205),(-.06+i*.10,-.015,1.18)],.01,[glass,wire][i],head)
for x in [-.10,.025]:
 line('Vertical can eye',[(x-.006,-.137,1.12),(x,-.145,1.064),(x+.005,-.142,1.045)],.008,dark,head)
 line('Eye scratch',[(x+.015,-.139,1.113),(x+.019,-.146,1.055)],.003,dark,head)
line('Uneven can mouth',[(-.12,-.134,1.005),(-.065,-.143,1.019),(.0,-.14,.997)],.005,dark,head)
for x in [-.14,.12]:box('Tape holding can',(x,.04,.806),(.10,.075,.005),cream,.001)
# Thin straight wire arm with circular elbow and squared two-prong gripper.
line('Right wire arm',[(.525,.015,.37),(.67,-.10,.38),(.28,-.35,.55)],.009,rim)
cyl('Arm round joint',(.67,-.10,.38),.026,.018,dark,(math.pi/2,0,0))
cyl('Arm joint center',(.67,-.111,.38),.016,.019,rim,(math.pi/2,0,0))
line('Gripper outer',[(.28,-.35,.55),(.27,-.35,.62),(.14,-.35,.66)],.009,rim)
line('Gripper inner',[(.28,-.35,.55),(.22,-.35,.51),(.10,-.35,.56)],.009,rim)
line('Left wire arm',[(-.51,.02,.42),(-.60,-.10,.43),(-.56,-.24,.53)],.009,rim)
# Compress only the unused panel strip; keep door/serving coordinates intact.
# Apply in world space so side face, arms and tracks remain attached.
bpy.context.view_layer.update()
for o in list(bpy.context.scene.objects):
 if o.type!='MESH':continue
 inv=o.matrix_world.inverted()
 for v in o.data.vertices:
  w=o.matrix_world@v.co
  if o.parent!=head:
   if any(t in o.name for t in ['circuit board','Circuit','Board trace']):
    w.x-=.12
   elif any(t in o.name for t in ['track','wheel','axle','Belt']):
    if o.location.x>0 or (o.location.x==0 and w.x>0):w.x-=.15
   elif any(t in o.name for t in ['arm','Arm','Gripper']):
    if w.x>.3:w.x-=.245
   elif w.x>.16:w.x=.16+(w.x-.16)*.30
  else:
   # More pronounced crumple and lean, shared by face, lid, ribs and wires.
   h=max(0,min(1,(w.z-.815)/.395))
   w.x-=.055*h*h
   w.z+=.013*math.sin((w.x+.05)*15)*math.sin(h*math.pi)
  v.co=inv@w
# Small asymmetric tape and enamel wear; kept sparse for readability.
for x,y,a in [(-.13,.12,.22),(.075,-.02,-.16)]:
 o=box('Aged tape patch',(x,y,.805),(.105,.053,.004),cream,.001);o.rotation_euler.z=a
for x,z in [(-.48,.73),(-.47,.32),(.12,.76)]:
 box('Enamel chip',(x,-.232,z),(.025,.004,.012),rim,.001)
# Preserve small face features as animation targets with local centered pivots.
face_prefixes=('Vertical can eye','Eye scratch','Side eye pupil','Uneven can mouth')
for o in list(bpy.context.scene.objects):
 if o.type=='MESH' and o.name.startswith(face_prefixes):
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
  bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY',center='BOUNDS')
# Right-panel eyes blink as complete units; can markings remain static.
for idx,y in enumerate([-.12,.12]):
 eye=bpy.data.objects.new('NEPTR_side_eye_'+str(idx),None);bpy.context.collection.objects.link(eye);eye.location=(.27,y,.64)
 bpy.context.view_layer.update()
 parts=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('Side eye') and abs(o.location.y-y)<.01]
 for o in parts:
  world=o.matrix_world.copy();o.parent=eye;o.matrix_world=world
# Mouth parts move together to avoid separating teeth, rim and tongue.
mouth_parts=[o for o in bpy.context.scene.objects if o.type=='MESH' and (o.name.startswith('Mouth') or o.name.startswith('Tongue'))]
mouth=bpy.data.objects.new('NEPTR_side_mouth',None);bpy.context.collection.objects.link(mouth);mouth.location=(.27,0,.49)
bpy.context.view_layer.update()
for o in mouth_parts:
 world=o.matrix_world.copy();o.parent=mouth;o.matrix_world=world
# Merge static pieces by material within body/head to keep runtime draw calls bounded.
for parent in [None,head,door]:
 for m in [metal,rim,dark,glass,cream,wire,green]:
  obs=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.parent==parent and o.data.materials and o.data.materials[0]==m and not o.name.startswith(face_prefixes)]
  if not obs:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in obs:o.select_set(True)
  bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();obs[0].name=('NEPTR head ' if parent else 'NEPTR body ')+m.name
# Export original authored file and glTF.
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/neptr.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/neptr.glb'),export_format='GLB',export_yup=True)
# Neutral studio evidence.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16
scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.2,.23,.25,1)
bpy.ops.object.light_add(type='AREA',location=(2,-3,4));bpy.context.object.data.energy=350;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=4
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=1.9
scene.render.resolution_x=700;scene.render.resolution_y=700;scene.render.resolution_percentage=100
out=ROOT/'docs/beyond-the-clearing/neptr';out.mkdir(parents=True,exist_ok=True)
for name,p in [('front',(0,-4,1.7)),('side',(4,-.5,1.7)),('three-quarter',(3,-4,2.2)),('rear',(0,4,1.7))]:
 cam.location=p;cam.rotation_euler=(Vector((0,0,.7))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
