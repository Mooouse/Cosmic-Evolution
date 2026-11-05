"""Trim real captured footage into CrazyGames-approved 15–20s previews.
Preserve original gameplay speed; do not speed up footage.
"""
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]/"video-export"
cuts={
 "1920x1080":[(1.1,4.4),(6.2,9.8),(11.4,15.2),(17.2,23.3)],
 "1080x1620":[(1.0,4.6),(5.7,9.4),(10.6,14.3),(15.6,21.4)]
}
for suffix,ranges in cuts.items():
    name=f"Infiniti_Space_Gameplay_{suffix}"
    src=ROOT/(name+".mp4")
    dest=ROOT/(name+"-short.mp4")
    assert src.is_file(),src
    filters=[]
    for i,(a,b) in enumerate(ranges):
        assert b>a
        filters.append(f"[0:v]trim=start={a}:end={b},setpts=PTS-STARTPTS[v{i}]")
    filters.append("".join(f"[v{i}]" for i in range(len(ranges)))+
                   f"concat=n={len(ranges)}:v=1:a=0,format=yuv420p[out]")
    subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(src),
      "-filter_complex",";".join(filters),"-map","[out]","-an",
      "-c:v","libx264","-preset","medium","-crf","20",
      "-r","24","-pix_fmt","yuv420p","-movflags","+faststart",str(dest)],check=True)
    assert dest.stat().st_size<50_000_000, "Video too large"
    duration=sum(b-a for a,b in ranges)
    assert 15<duration<20, duration
    dest.replace(src)
    print(f"PASS {name} / {duration:.2f}s / {src.stat().st_size:,} bytes",flush=True)
