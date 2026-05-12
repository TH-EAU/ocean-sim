vec3 transformed = position;

vec4 modelPosition = modelMatrix * vec4(transformed, 1.0);
modelPosition . y += sin(modelPosition.x*4.0+uTime*2.0)* 0.2 ;

transformed = ( inverse(modelMatrix)* modelPosition ) . xyz;
