#define MAX_STEP 255
#define MIN_DIST 0.01
#define MAX_DIST 100.0

uniform vec2 uResolution;

float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdf(vec3 p) {
    return sdSphere(p, 1.);
}

float rayMarch(vec3 origin, vec3 direction) {
    float totalDistance = 0.0; // init

    for(int i = 0; i < MAX_STEP; i++) {
        vec3 p = origin + totalDistance * direction;
        float distance = sdf(p);
        totalDistance += distance;

        // ici j'imagine que c'est une sécu
        if(abs(distance) < MIN_DIST || totalDistance > MAX_DIST)
            break;
    }
    return totalDistance;
}

vec3 calcNormal(in vec3 p) {
    vec2 e = vec2(1.0, -1.0) * 0.0005; // pourquoi le 0.0005 ?
    return normalize( // gradient ?
    e.xyy * sdf(p + e.xyy) +
        e.yyx * sdf(p + e.yyx) +
        e.yxy * sdf(p + e.yxy) +
        e.xxx * sdf(p + e.xxx));
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy / uResolution) - 1.0;
    uv.x *= uResolution.x / uResolution.y;

    vec3 lightPosition = vec3(5., 5., 1.);
    vec4 color = vec4(0);

    vec3 ro = vec3(0, 0, -4);
    vec3 rd = normalize(vec3(uv, 1)); // Direction du rayon mais je comprend pas

    float dist = rayMarch(ro, rd);
    if(dist > MAX_DIST) {
        color = vec4(0);
    } else {
        vec3 p = ro + dist * rd; // position objet touché
        vec3 normal = calcNormal(p);
        vec3 lightDirection = normalize(lightPosition - p);

        float ambiant = 0.1;
        float diffuse = max(dot(normal, lightDirection), 0.) * 0.5;
        float specular = pow(max(dot(reflect(-lightDirection, normal), normalize(ro - p)), 0.), 50.); // Encore une fois ya pleins de constantes que je comprends pas

        float light = ambiant + diffuse + specular;

        // float ambOccl = clamp(pow(AmbientOcclusion(p,normal,0.015,20.),32.),0.1,1.);
        // float sh = clamp(softShadow(p, lightDirection, 0.02, 20.5, 0.5), 0.1, 1.);
        color = vec4(vec3(1) * (light), 1.0);
    }

    gl_FragColor = color;
}