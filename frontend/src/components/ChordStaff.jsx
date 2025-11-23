import React, { useEffect, useRef } from 'react';
import Vex from 'vexflow';

const ChordStaff = ({ keys, width = 120, height = 160 }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 清空之前的内容
    containerRef.current.innerHTML = '';

    const VF = Vex.Flow;
    const renderer = new VF.Renderer(containerRef.current, VF.Renderer.Backends.SVG);

    renderer.resize(width, height);
    const context = renderer.getContext();
    
    // 创建五线谱，调整 y 轴位置，让它更居中 (之前是 20，现在改为 40)
    const stave = new VF.Stave(10, 40, width - 20);
    stave.addClef("treble");

    stave.setContext(context).draw();

    if (keys && keys.length > 0) {
        const staveNote = new VF.StaveNote({ clef: "treble", keys: keys, duration: "w" });

        // 自动添加升降号
        keys.forEach((key, index) => {
            const [notePart] = key.split('/'); 
            if (notePart.includes('#')) {
                staveNote.addModifier(new VF.Accidental('#'), index);
            } else if (notePart.includes('b')) {
                 staveNote.addModifier(new VF.Accidental('b'), index);
            }
        });

        const notes = [staveNote];
        const voice = new VF.Voice({ num_beats: 4,  beat_value: 4 });
        voice.addTickables(notes);
        new VF.Formatter().joinVoices([voice]).format([voice], width - 50);
        voice.draw(context, stave);
    }
  }, [keys, width, height]);

  return <div ref={containerRef} className="flex justify-center"></div>;
};

export default ChordStaff;
